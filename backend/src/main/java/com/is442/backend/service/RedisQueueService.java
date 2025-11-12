package com.is442.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.is442.backend.dto.CallNextResult;
import com.is442.backend.dto.NotificationEvent;
import com.is442.backend.dto.PositionSnapshot;
import com.is442.backend.dto.QueueItemDto;
import com.is442.backend.dto.QueueStateDto;
import com.is442.backend.dto.QueueStatus;
import com.is442.backend.model.Doctor;
import com.is442.backend.model.User;
import com.is442.backend.repository.DoctorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.concurrent.CompletableFuture;
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

    // Now Serving => track the last served patient
    private static String kNowServing(String clinicId) {
        return "clinic:" + clinicId + ":nowServing";
    }

    // Stores appointment metadata (combines patient and doctor information)
    private static String kAppointment(String appointmentId) {
        return "appointment:" + appointmentId;
    }

    private final StringRedisTemplate strTpl; // strings, hashes, zsets
    private final RedisTemplate<String, Object> jsonTpl; // (unused here but kept)
    private final DefaultRedisScript<List> dequeueScript; // Lua: [pid, nowServing, k1,v1,...]

    @Autowired
    private UserService userService;

    @Autowired(required = false)
    private AppointmentService appointmentService;

    @Autowired(required = false)
    private NotificationEventProducer notificationEventProducer;

    @Autowired(required = false)
    private DoctorRepository doctorRepository;

    @Autowired(required = false)
    private QueueSseService queueSseService; // For queue state broadcasts via SSE

    private final ObjectMapper objectMapper = new ObjectMapper(); // For JSON serialization

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

        // 2) store appointment metadata (HASH) - combines patient and doctor info
        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("appointmentId", appointmentId);
        meta.put("patientId", patientId);
        meta.put("clinicId", clinicId);
        meta.put("seq", String.valueOf(seq)); // stable ticket number
        meta.put("phone", user.getPhone());
        meta.put("email", user.getEmail());
        meta.put("name", user.getFirstName() + " " + user.getLastName());
        meta.put("createdAt", Instant.now().toString());

        // 3) Validate and fetch doctor information if provided
        if (doctorId != null && !doctorId.trim().isEmpty()) {
            if (doctorRepository == null) {
                throw new RuntimeException("DoctorRepository is not available. Cannot validate doctorId: " + doctorId);
            }

            Optional<Doctor> doctorOpt = doctorRepository.findByDoctorId(doctorId);
            if (doctorOpt.isPresent()) {
                Doctor doctor = doctorOpt.get();
                meta.put("doctorId", doctor.getDoctorId());
                meta.put("doctorName", doctor.getDoctorName() != null ? doctor.getDoctorName() : "");
                meta.put("doctorSpeciality", doctor.getSpeciality() != null ? doctor.getSpeciality() : "");
                meta.put("clinicName", doctor.getClinicName() != null ? doctor.getClinicName() : "");
                meta.put("clinicAddress", doctor.getClinicAddress() != null ? doctor.getClinicAddress() : "");
            } else {
                // Doctor not found in database - throw exception
                throw new IllegalArgumentException("Doctor not found with ID: " + doctorId);
            }
        }

        strTpl.opsForHash().putAll(kAppointment(appointmentId), meta);

        // 4) enqueue in ZSET with seq as score (FIFO)
        strTpl.opsForZSet().add(kQueue(clinicId), appointmentId, (double) seq);

        // 5) compute 1-based position via ZRANK
        Long rank = strTpl.opsForZSet().rank(kQueue(clinicId), appointmentId);
        int position = (rank == null ? 0 : (int) (rank + 1));

        // 6) register clinic id for dashboards
        strTpl.opsForSet().add(KEY_CLINICS, clinicId);

        // 7) Send N3_AWAY notification if position is 3
        if (position == 3 && notificationEventProducer != null) {
            sendN3AwayNotification(clinicId, appointmentId, patientId, user);
        }

        // 8) Broadcast queue state update via SSE (for UI updates)
        broadcastQueueStateUpdate(clinicId);

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

        // If doctorId is provided, peek at the first appointment and update doctor info
        // BEFORE dequeue (since dequeue deletes the hash)
        // This ensures doctor info is included in the data returned by the Lua script
        if (doctorId != null && !doctorId.trim().isEmpty()) {
            // Get the first appointment ID from the queue (without removing it)
            Set<String> firstAppointment = strTpl.opsForZSet().range(kQueue(clinicId), 0, 0);
            if (firstAppointment != null && !firstAppointment.isEmpty()) {
                String appointmentIdToUpdate = firstAppointment.iterator().next();
                if (appointmentIdToUpdate != null && !appointmentIdToUpdate.trim().isEmpty()) {
                    try {
                        // Update doctor info in the appointment hash before it gets deleted by dequeue
                        updateDoctorAssignment(appointmentIdToUpdate, doctorId, clinicId);
                    } catch (IllegalStateException e) {
                        // Appointment hash doesn't exist - this shouldn't happen but handle gracefully
                        // Continue with dequeue anyway
                    } catch (IllegalArgumentException e) {
                        // Doctor not found - rethrow as this is a validation error
                        throw e;
                    }
                }
            }
        }

        // KEYS: queue, nowServing (events removed)
        List<String> keys = List.of(
                kQueue(clinicId),
                kNowServing(clinicId));
        // ARGS: prefix (doctorId is not needed - doctor info is updated in Java before
        // calling this script)
        List<String> args = List.of("appointment:"); // prefix expected by Lua: kAppointment = "appointment:" + id

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

        // Update appointment in database if AppointmentService is available
        // Note: For walk-in appointments, this may not exist yet (created
        // asynchronously)
        // So we handle the case gracefully without failing the call-next operation
        if (doctorId != null && !doctorId.trim().isEmpty() && appointmentService != null) {
            try {
                UUID appointmentUuid = UUID.fromString(appointmentId);
                boolean updated = appointmentService.updateAppointmentDoctorId(appointmentUuid, doctorId);
                if (!updated) {
                    // Appointment doesn't exist yet - this is OK for walk-ins
                    // The doctorId is already stored in Redis (before dequeue), and when the
                    // appointment
                    // is created asynchronously, it will use the doctorId from Redis if available
                }
            } catch (Exception e) {
                // Log but don't fail the call-next if update fails
                // This is a non-critical operation
            }
        }

        // Send NOW_SERVING notification to the patient being called
        // Note: fields contains all appointment hash data retrieved BEFORE deletion in
        // Lua
        // script, including the updated doctor info
        if (notificationEventProducer != null && appointmentId != null && !appointmentId.isEmpty()) {
            sendNowServingNotification(clinicId, appointmentId, patientId, fields, doctorId);
        }

        // Check if anyone in the queue is now at position 3 and send N3_AWAY
        // notification
        if (notificationEventProducer != null) {
            checkAndNotifyN3Away(clinicId);
        }

        // Broadcast queue state update via SSE (for UI updates)
        broadcastQueueStateUpdate(clinicId);

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

        Map<Object, Object> meta = strTpl.opsForHash().entries(kAppointment(appointmentId));
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

    /**
     * Returns the complete queue state for a clinic, including all queue items with
     * their details.
     * 
     * @param clinicId the clinic identifier
     * @return QueueStateDto containing clinic status and list of all queue items
     * @throws IllegalArgumentException if clinicId is invalid
     */
    public QueueStateDto getQueueState(String clinicId) {
        validateNonEmpty(clinicId, "clinicId");

        // Get basic queue status
        QueueStatus status = getQueueStatus(clinicId);
        long nowServing = status.getNowServing();
        int totalWaiting = status.getTotalWaiting();

        // Get all appointment IDs from the queue (sorted by score/seq)
        Set<String> appointmentIds = strTpl.opsForZSet().range(kQueue(clinicId), 0, -1);

        List<QueueItemDto> queueItems = new ArrayList<>();

        if (appointmentIds != null && !appointmentIds.isEmpty()) {
            // Convert to list to get index-based position
            List<String> appointmentList = new ArrayList<>(appointmentIds);

            // For each appointment, get its metadata and create QueueItemDto
            for (int i = 0; i < appointmentList.size(); i++) {
                String appointmentId = appointmentList.get(i);
                int position = i + 1; // 1-based position

                // Get appointment metadata from Redis hash
                Map<Object, Object> meta = strTpl.opsForHash().entries(kAppointment(appointmentId));

                if (meta != null && !meta.isEmpty()) {
                    QueueItemDto item = QueueItemDto.fromRedisMetadata(appointmentId, meta, position);
                    queueItems.add(item);
                }
            }
        }

        return new QueueStateDto(clinicId, nowServing, totalWaiting, queueItems);
    }

    /**
     * Broadcasts complete queue state to SSE subscribers.
     * This is called after queue-changing operations to keep frontend in sync.
     * 
     * @param clinicId the clinic identifier
     */
    private void broadcastQueueStateUpdate(String clinicId) {
        if (queueSseService == null) {
            return; // SSE service not available
        }

        try {
            // Get current queue state
            QueueStateDto state = getQueueState(clinicId);

            // Create event payload with full state
            Map<String, Object> eventPayload = new LinkedHashMap<>();
            eventPayload.put("type", "QUEUE_STATE_UPDATE");
            eventPayload.put("clinicId", clinicId);
            eventPayload.put("timestamp", System.currentTimeMillis());
            eventPayload.put("nowServing", state.getNowServing());
            eventPayload.put("totalWaiting", state.getTotalWaiting());

            // Convert queue items to maps
            List<Map<String, Object>> queueItemsList = new ArrayList<>();
            for (QueueItemDto item : state.getQueueItems()) {
                Map<String, Object> itemMap = new LinkedHashMap<>();
                itemMap.put("appointmentId", item.getAppointmentId());
                itemMap.put("patientId", item.getPatientId());
                itemMap.put("patientName", item.getPatientName());
                itemMap.put("email", item.getEmail());
                itemMap.put("phone", item.getPhone());
                itemMap.put("position", item.getPosition());
                itemMap.put("queueNumber", item.getQueueNumber());
                itemMap.put("doctorId", item.getDoctorId());
                itemMap.put("doctorName", item.getDoctorName());
                itemMap.put("doctorSpeciality", item.getDoctorSpeciality());
                itemMap.put("createdAt", item.getCreatedAt());
                queueItemsList.add(itemMap);
            }
            eventPayload.put("queueItems", queueItemsList);

            // Serialize to JSON and broadcast
            String json = objectMapper.writeValueAsString(eventPayload);
            queueSseService.publishToClinic(clinicId, json);

        } catch (Exception e) {
            // Log but don't fail the operation
            System.err.println("[RedisQueueService] Failed to broadcast queue state update: " + e.getMessage());
            e.printStackTrace();
        }
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

        String seq = (String) strTpl.opsForHash().get(kAppointment(appointmentId), "seq");
        return parseLongSafe(seq, 0L);
    }

    /** List all clinics that have registered activity. */
    public Set<String> listClinics() {
        Set<String> clinics = strTpl.opsForSet().members(KEY_CLINICS);
        return (clinics == null) ? Set.of() : clinics;
    }

    /** Get doctorId from appointment metadata. */
    public String getDoctorIdFromAppointment(String appointmentId) {
        if (appointmentId == null || appointmentId.trim().isEmpty()) {
            return null;
        }
        String doctorId = (String) strTpl.opsForHash().get(kAppointment(appointmentId), "doctorId");
        return (doctorId != null && !doctorId.trim().isEmpty()) ? doctorId : null;
    }

    /**
     * Moves an appointment to the top of the queue by updating its ZSET score.
     * 
     * @param appointmentId the appointment identifier to fast-track
     * @return the new position (should be 1 if successful)
     * @throws IllegalArgumentException if appointmentId is invalid
     * @throws RuntimeException         if appointment is not found in queue
     */
    public int fastTrack(String appointmentId) {
        validateNonEmpty(appointmentId, "appointmentId");

        // Validate UUID format
        try {
            UUID.fromString(appointmentId);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    "Invalid appointmentId format: " + appointmentId + ". Must be a valid UUID.");
        }

        // Get appointment metadata to find clinicId
        Map<Object, Object> meta = strTpl.opsForHash().entries(kAppointment(appointmentId));
        if (meta == null || meta.isEmpty()) {
            throw new RuntimeException("Appointment not found: " + appointmentId);
        }

        String clinicId = (String) meta.get("clinicId");
        if (clinicId == null || clinicId.trim().isEmpty()) {
            throw new RuntimeException("Appointment does not have a clinicId: " + appointmentId);
        }

        // Check if appointment exists in queue
        Double currentScore = strTpl.opsForZSet().score(kQueue(clinicId), appointmentId);
        if (currentScore == null) {
            throw new RuntimeException("Appointment not found in queue: " + appointmentId);
        }

        // Get the minimum score in the queue (the first element)
        Set<String> firstElement = strTpl.opsForZSet().range(kQueue(clinicId), 0, 0);
        if (firstElement == null || firstElement.isEmpty()) {
            throw new RuntimeException("Queue is empty for clinic: " + clinicId);
        }

        // Get minimum score from the queue
        Set<org.springframework.data.redis.core.ZSetOperations.TypedTuple<String>> rangeWithScores = strTpl.opsForZSet()
                .rangeWithScores(kQueue(clinicId), 0, 0);

        double minScore = 1.0; // Default if queue is somehow empty
        if (rangeWithScores != null && !rangeWithScores.isEmpty()) {
            org.springframework.data.redis.core.ZSetOperations.TypedTuple<String> first = rangeWithScores.iterator()
                    .next();
            Double score = first.getScore();
            minScore = (score != null) ? score.doubleValue() : 1.0;
        }

        // Set the appointment's score to be lower than the minimum
        // Use minScore - 1, or 0.5 if minScore is 1 or less
        double newScore = (minScore <= 1.0) ? 0.5 : (minScore - 1.0);
        strTpl.opsForZSet().add(kQueue(clinicId), appointmentId, newScore);

        // Get the new position (should be 1)
        Long rank = strTpl.opsForZSet().rank(kQueue(clinicId), appointmentId);
        int position = (rank == null ? 0 : (int) (rank + 1));

        // Broadcast queue state update via SSE (for UI updates)
        broadcastQueueStateUpdate(clinicId);

        return position;
    }

    /**
     * Removes an appointment from the queue.
     * This removes the appointment from the ZSET (queue) and deletes the
     * appointment hash.
     * Asynchronously updates the appointment status to "NO_SHOW" in the database.
     * 
     * @param appointmentId the appointment identifier to remove from queue
     * @return the clinicId of the removed appointment
     * @throws IllegalArgumentException if appointmentId is invalid
     * @throws RuntimeException         if appointment is not found in queue
     */
    public String removeFromQueue(String appointmentId) {
        validateNonEmpty(appointmentId, "appointmentId");

        // Validate UUID format
        UUID appointmentUuid;
        try {
            appointmentUuid = UUID.fromString(appointmentId);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException(
                    "Invalid appointmentId format: " + appointmentId + ". Must be a valid UUID.");
        }

        // Get appointment metadata to find clinicId
        Map<Object, Object> meta = strTpl.opsForHash().entries(kAppointment(appointmentId));
        if (meta == null || meta.isEmpty()) {
            throw new RuntimeException("Appointment not found: " + appointmentId);
        }

        String clinicId = (String) meta.get("clinicId");
        if (clinicId == null || clinicId.trim().isEmpty()) {
            throw new RuntimeException("Appointment does not have a clinicId: " + appointmentId);
        }

        // Check if appointment exists in queue
        Double currentScore = strTpl.opsForZSet().score(kQueue(clinicId), appointmentId);
        if (currentScore == null) {
            throw new RuntimeException("Appointment not found in queue: " + appointmentId);
        }

        // Remove from queue (ZSET)
        Long removed = strTpl.opsForZSet().remove(kQueue(clinicId), appointmentId);
        if (removed == null || removed == 0) {
            throw new RuntimeException("Failed to remove appointment from queue: " + appointmentId);
        }

        // Delete the appointment hash
        strTpl.delete(kAppointment(appointmentId));

        // Asynchronously update appointment status to NO_SHOW in database
        if (appointmentService != null) {
            CompletableFuture.runAsync(() -> {
                try {
                    appointmentService.markNoShow(appointmentUuid);
                    System.out.println("[RedisQueueService] Asynchronously updated appointment " + appointmentId
                            + " status to NO_SHOW");
                } catch (Exception e) {
                    // Log but don't fail the queue removal if status update fails
                    // This is a non-critical operation
                    System.err.println(
                            "[RedisQueueService] Failed to update appointment status to NO_SHOW: " + e.getMessage());
                    e.printStackTrace();
                }
            });
        }

        // Broadcast queue state update via SSE (for UI updates)
        broadcastQueueStateUpdate(clinicId);

        return clinicId;
    }

    /**
     * Update doctor assignment for an appointment. Fetches doctor info and updates
     * appointment hash. Validates that doctor exists in database.
     * Only updates doctor fields - does not create a new appointment hash.
     * The appointment hash should already exist from checkIn().
     */
    public void updateDoctorAssignment(String appointmentId, String doctorId, String clinicId) {
        if (appointmentId == null || appointmentId.trim().isEmpty()) {
            return;
        }

        // Check if appointment hash exists - if not, this method shouldn't be called
        // as the appointment should be created via checkIn() first
        Map<Object, Object> existingMeta = strTpl.opsForHash().entries(kAppointment(appointmentId));
        if (existingMeta == null || existingMeta.isEmpty()) {
            throw new IllegalStateException(
                    "Cannot update doctor assignment: Appointment hash does not exist for appointmentId: "
                            + appointmentId + ". Appointment must be created via checkIn() first.");
        }

        if (doctorId != null && !doctorId.trim().isEmpty()) {
            if (doctorRepository == null) {
                throw new RuntimeException("DoctorRepository is not available. Cannot validate doctorId: " + doctorId);
            }

            // Fetch doctor information from database and validate existence
            Optional<Doctor> doctorOpt = doctorRepository.findByDoctorId(doctorId);
            if (doctorOpt.isPresent()) {
                Doctor doctor = doctorOpt.get();
                // Update appointment hash with doctor information (preserves existing
                // patient/appointment fields)
                strTpl.opsForHash().put(kAppointment(appointmentId), "doctorId", doctor.getDoctorId());
                strTpl.opsForHash().put(kAppointment(appointmentId), "doctorName",
                        doctor.getDoctorName() != null ? doctor.getDoctorName() : "");
                strTpl.opsForHash().put(kAppointment(appointmentId), "doctorSpeciality",
                        doctor.getSpeciality() != null ? doctor.getSpeciality() : "");
                strTpl.opsForHash().put(kAppointment(appointmentId), "clinicName",
                        doctor.getClinicName() != null ? doctor.getClinicName() : "");
                strTpl.opsForHash().put(kAppointment(appointmentId), "clinicAddress",
                        doctor.getClinicAddress() != null ? doctor.getClinicAddress() : "");
            } else {
                // Doctor not found in database - throw exception
                throw new IllegalArgumentException("Doctor not found with ID: " + doctorId);
            }
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

    /**
     * Builds a JSON payload for notification events with patient information.
     * Includes: name, email, phone, appointment_id, queue number, clinicId,
     * doctorId, and message
     * content.
     * 
     * @param eventType     the type of event ("N3_AWAY" or "NOW_SERVING")
     * @param meta          patient metadata from Redis hash
     * @param appointmentId the appointment ID
     * @param clinicId      the clinic ID
     * @param doctorId      the doctor ID (can be null)
     * @return JSON string payload
     */
    private String buildNotificationPayload(String eventType, Map<Object, Object> meta, String appointmentId,
            String clinicId, String doctorId) {
        // Extract patient information from metadata
        String name = getStringFromMeta(meta, "name", "Patient");
        String email = getStringFromMeta(meta, "email", "");
        String phone = getStringFromMeta(meta, "phone", "");
        String queueNumber = getStringFromMeta(meta, "seq", "0");

        // Get clinicId from meta if not provided (fallback)
        if (clinicId == null || clinicId.trim().isEmpty()) {
            clinicId = getStringFromMeta(meta, "clinicId", "");
        }

        // Get doctorId and doctorName from appointment if not provided (fallback)
        String doctorName = "";
        if (doctorId == null || doctorId.trim().isEmpty()) {
            doctorId = getDoctorIdFromAppointment(appointmentId);
            if (doctorId == null) {
                doctorId = "";
            }
        }

        // Get doctorName from metadata if available
        if (doctorId != null && !doctorId.trim().isEmpty()) {
            doctorName = getStringFromMeta(meta, "doctorName", "");
        }

        // Build message based on event type
        String subject;
        String body;

        if ("N3_AWAY".equals(eventType)) {
            subject = "You're 3 away";
            body = String.format("Please return to the waiting area. Your queue number is %s.", queueNumber);
        } else { // NOW_SERVING
            subject = "You're being called";
            body = String.format("%s, please proceed to the consultation room. Your queue number is %s.",
                    name, queueNumber);
        }

        // Build comprehensive JSON payload with clinicId, doctorId, and doctorName
        return String.format(
                "{\"subject\":\"%s\",\"body\":\"%s\",\"clinicId\":\"%s\",\"doctorId\":\"%s\",\"doctorName\":\"%s\",\"patient\":{\"name\":\"%s\",\"email\":\"%s\",\"phone\":\"%s\",\"appointment_id\":\"%s\",\"queue_number\":\"%s\"}}",
                escapeJson(subject),
                escapeJson(body),
                escapeJson(clinicId),
                escapeJson(doctorId != null ? doctorId : ""),
                escapeJson(doctorName),
                escapeJson(name),
                escapeJson(email),
                escapeJson(phone),
                escapeJson(appointmentId),
                escapeJson(queueNumber));
    }

    /**
     * Safely extracts a string value from metadata map.
     */
    private String getStringFromMeta(Map<Object, Object> meta, String key, String defaultValue) {
        Object value = meta.get(key);
        if (value == null) {
            return defaultValue;
        }
        String str = value.toString();
        return str.trim().isEmpty() ? defaultValue : str;
    }

    /**
     * Escapes special JSON characters in a string.
     */
    private String escapeJson(String str) {
        if (str == null) {
            return "";
        }
        return str.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    /**
     * Sends N3_AWAY notification to a patient who is 3 positions away from being
     * called.
     */
    private void sendN3AwayNotification(String clinicId, String appointmentId, String patientId, User user) {
        if (notificationEventProducer == null) {
            return;
        }

        try {
            // Get appointment metadata from Redis hash (includes both patient and doctor
            // info)
            Map<Object, Object> meta = strTpl.opsForHash().entries(kAppointment(appointmentId));

            // Get doctorId from appointment metadata
            String doctorId = getDoctorIdFromAppointment(appointmentId);
            if (doctorId == null) {
                doctorId = "";
            }

            // Build payload with all patient information including clinicId and doctorId
            String payload = buildNotificationPayload("N3_AWAY", meta, appointmentId, clinicId, doctorId);

            NotificationEvent event = new NotificationEvent(
                    "N3_AWAY",
                    clinicId,
                    appointmentId,
                    patientId,
                    "EMAIL", // Default channel, can be enhanced to support multiple channels
                    payload,
                    System.currentTimeMillis());

            notificationEventProducer.publish(event);
            System.out.println("[RedisQueueService] Sent N3_AWAY notification for appointment: " + appointmentId);
        } catch (Exception e) {
            // Log but don't fail the check-in if notification fails
            // This is a non-critical operation
            System.err.println("[RedisQueueService] Failed to send N3_AWAY notification: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Sends NOW_SERVING notification to a patient who is being called.
     * Uses patient fields from the dequeued data (retrieved from Redis hash before
     * deletion).
     * 
     * @param clinicId      the clinic ID
     * @param appointmentId the appointment ID
     * @param patientId     the patient ID
     * @param patientFields patient data retrieved from Redis hash (before deletion
     *                      in Lua script)
     * @param doctorId      the doctor ID (can be null)
     */
    private void sendNowServingNotification(String clinicId, String appointmentId, String patientId,
            Map<String, String> patientFields, String doctorId) {
        if (notificationEventProducer == null) {
            return;
        }

        try {
            // Convert Map<String, String> to Map<Object, Object> for consistency
            // Note: patientFields contains all data from Redis hash (name, email, phone,
            // clinicId, etc.)
            // retrieved by Lua script's HGETALL before the hash was deleted
            Map<Object, Object> meta = new LinkedHashMap<>();
            for (Map.Entry<String, String> entry : patientFields.entrySet()) {
                meta.put(entry.getKey(), entry.getValue());
            }

            // Build payload with all patient information including clinicId and doctorId
            String payload = buildNotificationPayload("NOW_SERVING", meta, appointmentId, clinicId, doctorId);

            NotificationEvent event = new NotificationEvent(
                    "NOW_SERVING",
                    clinicId,
                    appointmentId,
                    patientId,
                    "EMAIL", // Default channel, can be enhanced to support multiple channels
                    payload,
                    System.currentTimeMillis());

            notificationEventProducer.publish(event);
            System.out.println("[RedisQueueService] Sent NOW_SERVING notification for appointment: " + appointmentId);
        } catch (Exception e) {
            // Log but don't fail the call-next if notification fails
            // This is a non-critical operation
            System.err.println("[RedisQueueService] Failed to send NOW_SERVING notification: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Checks all patients in the queue and sends N3_AWAY notification to anyone at
     * position 3.
     * This is called after callNext() to notify patients who moved to position 3.
     */
    private void checkAndNotifyN3Away(String clinicId) {
        if (notificationEventProducer == null) {
            return;
        }

        try {
            // Get all appointment IDs in the queue (sorted by score/seq)
            Set<String> appointmentIds = strTpl.opsForZSet().range(kQueue(clinicId), 0, -1);

            if (appointmentIds == null || appointmentIds.isEmpty()) {
                return;
            }

            // Convert to list to get index-based position
            List<String> appointmentList = new ArrayList<>(appointmentIds);

            // Check if there's a patient at position 3 (0-indexed = 2)
            if (appointmentList.size() >= 3) {
                String appointmentIdAtPosition3 = appointmentList.get(2); // 0-indexed, so index 2 = position 3

                // Get appointment metadata from Redis (includes both patient and doctor info)
                Map<Object, Object> meta = strTpl.opsForHash().entries(kAppointment(appointmentIdAtPosition3));

                if (meta != null && !meta.isEmpty()) {
                    String patientId = (String) meta.get("patientId");

                    if (patientId != null && !patientId.trim().isEmpty()) {
                        // Get doctorId from appointment metadata
                        String doctorId = getDoctorIdFromAppointment(appointmentIdAtPosition3);
                        if (doctorId == null) {
                            doctorId = "";
                        }

                        // Build payload with all patient information including clinicId and doctorId
                        String payload = buildNotificationPayload("N3_AWAY", meta, appointmentIdAtPosition3, clinicId,
                                doctorId);

                        NotificationEvent event = new NotificationEvent(
                                "N3_AWAY",
                                clinicId,
                                appointmentIdAtPosition3,
                                patientId,
                                "EMAIL", // Default channel, can be enhanced to support multiple channels
                                payload,
                                System.currentTimeMillis());

                        notificationEventProducer.publish(event);
                        System.out.println(
                                "[RedisQueueService] Sent N3_AWAY notification (post-callNext) for appointment: "
                                        + appointmentIdAtPosition3);
                    }
                }
            }
        } catch (Exception e) {
            // Log but don't fail the call-next if notification check fails
            // This is a non-critical operation
            System.err.println("[RedisQueueService] Failed to check/send N3_AWAY notification: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
