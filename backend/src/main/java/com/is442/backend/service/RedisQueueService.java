package com.is442.backend.service;

import com.is442.backend.dto.CallNextResult;
import com.is442.backend.dto.PositionSnapshot;
import com.is442.backend.dto.QueueStatus;
import com.is442.backend.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

@Service
public class RedisQueueService {

    private static final String KEY_CLINICS = "clinics";

    // Sequence Queue => track what number it is based on which clinic
    private static String kSeq(String clinicId) {
        return "clinic:" + clinicId + ":seq";
    }

    // Queue => track the queue of patients
    private static String kQueue(String clinicId) {
        return "clinic:" + clinicId + ":queue";
    }

    // Events => track the events of the queue
    private static String kEvents(String clinicId) {
        return "clinic:" + clinicId + ":events";
    }

    // Now Serving => track the last served patient
    private static String kNowServing(String clinicId) {
        return "clinic:" + clinicId + ":nowServing";
    }

    // Stores appointment meta data
    private static String kPatient(String appointmentId) {
        return "patient:" + appointmentId;
    }

    private final StringRedisTemplate strTpl; // strings, hashes, zsets
    private final RedisTemplate<String, Object> jsonTpl; // (unused here but kept)
    private final DefaultRedisScript<List> dequeueScript; // Lua: [pid, nowServing, k1,v1,...]

    @Autowired
    private UserService userService;

    @Autowired(required = false)
    private AppointmentService appointmentService;

    public RedisQueueService(StringRedisTemplate strTpl,
            RedisTemplate<String, Object> jsonTpl,
            DefaultRedisScript<List> dequeueScript) {
        this.strTpl = strTpl;
        this.jsonTpl = jsonTpl;
        this.dequeueScript = dequeueScript;
    }

    /**
     * Return type for check-in: both live position and stable queueNumber (seq).
     */
    public record CheckinResult(int position, long queueNumber) {
    }

    /**
     * Check a patient into a clinic queue. Returns (position, queueNumber).
     * 
     * @param clinicId            the clinic identifier
     * @param appointmentId       the appointment identifier (can be auto-generated)
     * @param patientId           the patient identifier
     * @param validateAppointment if true, validates that the appointment exists in
     *                            the database
     * @param doctorId            optional doctor ID to associate with the
     *                            appointment
     * @throws IllegalArgumentException if any parameter is invalid
     * @throws RuntimeException         if user or appointment validation fails
     */
    public CheckinResult checkIn(String clinicId, String appointmentId, String patientId, boolean validateAppointment,
            String doctorId) {
        // Validate non-null and non-empty
        validateNonEmpty(clinicId, "clinicId");
        validateNonEmpty(patientId, "patientId");
        validateNonEmpty(appointmentId, "appointmentId");

        // Validate UUID format for patientId
        UUID patientUuid;
        try {
            patientUuid = UUID.fromString(patientId);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid patientId format: " + patientId + ". Must be a valid UUID.");
        }

        // Validate UUID format for appointmentId
        if (!appointmentId.isEmpty()) {
            try {
                UUID.fromString(appointmentId);
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException(
                        "Invalid appointmentId format: " + appointmentId + ". Must be a valid UUID.");
            }
        }

        // Fetch user profile (throws RuntimeException if user not found)
        User user;
        try {
            user = userService.findBySupabaseUserId(patientUuid);
        } catch (RuntimeException e) {
            throw new RuntimeException("Patient not found with ID: " + patientId + ". " + e.getMessage(), e);
        }

        // Optional: Validate appointment exists if AppointmentService is available AND
        // validation is requested
        if (validateAppointment && appointmentService != null && !appointmentId.isEmpty()) {
            try {
                UUID appointmentUuid = UUID.fromString(appointmentId);
                appointmentService.getAppointmentById(appointmentUuid);
            } catch (IllegalArgumentException e) {
                // Already validated above, but catch just in case
                throw new IllegalArgumentException("Invalid appointmentId format: " + appointmentId);
            } catch (RuntimeException e) {
                throw new RuntimeException("Appointment not found with ID: " + appointmentId, e);
            }
        }

        // 1) allocate next sequence (first time -> 1 because INCR on 0/nonexistent
        // starts at 1)
        long seq = Optional.ofNullable(
                strTpl.opsForValue().increment(kSeq(clinicId))).orElse(1L);

        // 2) store patient metadata (HASH)
        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("appointmentId", appointmentId);
        meta.put("patientId", patientId);
        meta.put("clinicId", clinicId);
        meta.put("seq", String.valueOf(seq)); // stable ticket number
        meta.put("phone", user.getPhone());
        meta.put("email", user.getEmail());
        meta.put("name", user.getFirstName() + " " + user.getLastName());
        meta.put("createdAt", Instant.now().toString());
        // Store doctorId in metadata if provided
        if (doctorId != null && !doctorId.trim().isEmpty()) {
            meta.put("doctorId", doctorId);
        }
        strTpl.opsForHash().putAll(kPatient(appointmentId), meta);

        // 3) enqueue in ZSET with seq as score (FIFO)
        strTpl.opsForZSet().add(kQueue(clinicId), appointmentId, (double) seq);

        // 4) compute 1-based position via ZRANK
        Long rank = strTpl.opsForZSet().rank(kQueue(clinicId), appointmentId);
        int position = (rank == null ? 0 : (int) (rank + 1));

        // 5) register clinic id for dashboards
        strTpl.opsForSet().add(KEY_CLINICS, clinicId);

        return new CheckinResult(position, seq);
    }

    /**
     * Check a patient into a clinic queue. Returns (position, queueNumber).
     * Convenience method that validates appointments by default.
     * 
     * @throws IllegalArgumentException if any parameter is invalid
     * @throws RuntimeException         if user or appointment validation fails
     */
    public CheckinResult checkIn(String clinicId, String appointmentId, String patientId) {
        return checkIn(clinicId, appointmentId, patientId, true, null);
    }

    /**
     * Atomically dequeue the next patient via Lua.
     * Lua returns: [ appointmentId, nowServing, k1, v1, k2, v2, ... ]
     * We parse hash fields to obtain patientId and (redundantly) seq ->
     * queueNumber.
     * 
     * @param clinicId the clinic identifier
     * @param doctorId optional doctor ID to assign to the appointment
     * @throws IllegalArgumentException if clinicId is invalid
     */
    public CallNextResult callNext(String clinicId, String doctorId) {
        validateNonEmpty(clinicId, "clinicId");

        // KEYS: queue, events, nowServing
        List<String> keys = List.of(
                kQueue(clinicId),
                kEvents(clinicId),
                kNowServing(clinicId));
        List<String> args = List.of("patient:"); // prefix expected by Lua: kPatient = "patient:" + id

        List<?> res = strTpl.execute(dequeueScript, keys, args.toArray());
        if (res == null || res.isEmpty() || Boolean.FALSE.equals(res.get(0))) {
            return CallNextResult.empty(clinicId);
        }

        // Lua: [ pid, nowServing, k1, v1, k2, v2, ... ]
        String appointmentId = (String) res.get(0);
        long nowServing = parseLongSafe((String) res.get(1), 0L);

        Map<String, String> fields = new LinkedHashMap<>();
        for (int i = 2; i + 1 < res.size(); i += 2) {
            fields.put((String) res.get(i), (String) res.get(i + 1));
        }

        String patientId = fields.getOrDefault("patientId", "");
        long queueNumber = parseLongSafe(fields.get("seq"), 0L);

        // Update doctorId in Redis metadata and appointment if provided
        if (doctorId != null && !doctorId.trim().isEmpty() && appointmentId != null && !appointmentId.isEmpty()) {
            updateDoctorIdInAppointment(appointmentId, doctorId);

            // Update appointment in database if AppointmentService is available
            // Note: For walk-in appointments, this may not exist yet (created
            // asynchronously)
            // So we handle the case gracefully without failing the call-next operation
            if (appointmentService != null) {
                try {
                    UUID appointmentUuid = UUID.fromString(appointmentId);
                    boolean updated = appointmentService.updateAppointmentDoctorId(appointmentUuid, doctorId);
                    if (!updated) {
                        // Appointment doesn't exist yet - this is OK for walk-ins
                        // The doctorId is already stored in Redis, and when the appointment
                        // is created asynchronously, it will use the doctorId from Redis if available
                    }
                } catch (Exception e) {
                    // Log but don't fail the call-next if update fails
                    // This is a non-critical operation
                }
            }
        }

        // position=0 to mean "this appointment is now being served"
        return new CallNextResult(clinicId, appointmentId, patientId, 0, nowServing, queueNumber);
    }

    /**
     * Atomically dequeue the next patient via Lua.
     * Convenience method without doctorId parameter.
     * 
     * @throws IllegalArgumentException if clinicId is invalid
     */
    public CallNextResult callNext(String clinicId) {
        return callNext(clinicId, null);
    }

    /**
     * Snapshot of caller's current position by appointmentId.
     * This keeps your existing PositionSnapshot type unchanged (clinicId, position,
     * nowServing),
     * and we expose the stable ticket via getQueueNumber(appointmentId) when needed
     * by controller.
     * 
     * @throws IllegalArgumentException if appointmentId is invalid
     */
    public PositionSnapshot getCurrentPosition(String appointmentId) {
        validateNonEmpty(appointmentId, "appointmentId");

        // Validate UUID format
        try {
            UUID.fromString(appointmentId);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    "Invalid appointmentId format: " + appointmentId + ". Must be a valid UUID.");
        }

        Map<Object, Object> meta = strTpl.opsForHash().entries(kPatient(appointmentId));
        String clinicId = (String) meta.get("clinicId");
        if (clinicId == null) {
            // likely dequeued already
            return new PositionSnapshot(null, 0, 0L, 0L);
        }

        Long rank = strTpl.opsForZSet().rank(kQueue(clinicId), appointmentId);
        int position = (rank == null ? 0 : (int) (rank + 1));

        long nowServing = getNowServingSeqSafe(clinicId);
        long queueNumber = parseLongSafe((String) meta.get("seq"), 0L); // NEW

        return new PositionSnapshot(clinicId, position, nowServing, queueNumber);
    }

    // Resets now Serving and seq
    public void resetQnumber(String clinicId) {
        validateNonEmpty(clinicId, "clinicId");
        strTpl.opsForValue().set(kSeq(clinicId), "0");
        strTpl.opsForValue().set(kNowServing(clinicId), "0");
    }

    /** Aggregate status for a clinic queue. */
    public QueueStatus getQueueStatus(String clinicId) {
        validateNonEmpty(clinicId, "clinicId");
        Long waiting = strTpl.opsForZSet().zCard(kQueue(clinicId));
        long nowServing = getNowServingSeqSafe(clinicId);
        return new QueueStatus(clinicId, nowServing, waiting == null ? 0 : waiting.intValue());
    }

    /** Stable ticket number for an appointment (seq stored in the hash). */
    public long getQueueNumber(String appointmentId) {
        validateNonEmpty(appointmentId, "appointmentId");

        // Validate UUID format
        try {
            UUID.fromString(appointmentId);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    "Invalid appointmentId format: " + appointmentId + ". Must be a valid UUID.");
        }

        String seq = (String) strTpl.opsForHash().get(kPatient(appointmentId), "seq");
        return parseLongSafe(seq, 0L);
    }

    /** List all clinics that have registered activity. */
    public Set<String> listClinics() {
        Set<String> clinics = strTpl.opsForSet().members(KEY_CLINICS);
        return (clinics == null) ? Set.of() : clinics;
    }

    /** Get doctorId from appointment metadata stored in Redis. */
    public String getDoctorIdFromAppointment(String appointmentId) {
        if (appointmentId == null || appointmentId.trim().isEmpty()) {
            return null;
        }
        String doctorId = (String) strTpl.opsForHash().get(kPatient(appointmentId), "doctorId");
        return (doctorId != null && !doctorId.trim().isEmpty()) ? doctorId : null;
    }

    /** Update doctorId in appointment metadata stored in Redis. */
    public void updateDoctorIdInAppointment(String appointmentId, String doctorId) {
        if (appointmentId == null || appointmentId.trim().isEmpty()) {
            return;
        }
        if (doctorId != null && !doctorId.trim().isEmpty()) {
            strTpl.opsForHash().put(kPatient(appointmentId), "doctorId", doctorId);
        }
    }

    // Helpers
    private long getNowServingSeqSafe(String clinicId) {
        String val = strTpl.opsForValue().get(kNowServing(clinicId));
        return parseLongSafe(val, 0L);
    }

    private long parseLongSafe(String s, long dflt) {
        try {
            return (s == null) ? dflt : Long.parseLong(s);
        } catch (NumberFormatException e) {
            return dflt;
        }
    }

    /**
     * Validates that a string is not null and not empty (after trimming).
     * 
     * @param value     the value to validate
     * @param fieldName the name of the field for error messages
     * @throws IllegalArgumentException if value is null or empty
     */
    private void validateNonEmpty(String value, String fieldName) {
        if (value == null) {
            throw new IllegalArgumentException(fieldName + " cannot be null");
        }
        if (value.trim().isEmpty()) {
            throw new IllegalArgumentException(fieldName + " cannot be empty");
        }
    }
}
