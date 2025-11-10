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

    private final StringRedisTemplate strTpl;               // strings, hashes, zsets
    private final RedisTemplate<String, Object> jsonTpl;    // (unused here but kept)
    private final DefaultRedisScript<List> dequeueScript;   // Lua: [pid, nowServing, k1,v1,...]

    @Autowired
    private UserService userService;

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
    public record CheckinResult(int position, long queueNumber) {}

    /**
     * Check a patient into a clinic queue. Returns (position, queueNumber).
     */
    public CheckinResult checkIn(String clinicId, String appointmentId, String patientId) {
        Objects.requireNonNull(clinicId, "clinicId cannot be null");
        Objects.requireNonNull(patientId, "patientId cannot be null");
        Objects.requireNonNull(appointmentId, "appointmentId cannot be null");

        // Fetch user profile (throws if invalid UUID)
        User user = userService.findBySupabaseUserId(UUID.fromString(patientId));

        // 1) allocate next sequence (first time -> 1 because INCR on 0/nonexistent starts at 1)
        long seq = Optional.ofNullable(
                strTpl.opsForValue().increment(kSeq(clinicId))
        ).orElse(1L);

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
     * Atomically dequeue the next patient via Lua.
     * Lua returns: [ appointmentId, nowServing, k1, v1, k2, v2, ... ]
     * We parse hash fields to obtain patientId and (redundantly) seq -> queueNumber.
     */
    public CallNextResult callNext(String clinicId) {
        Objects.requireNonNull(clinicId, "clinicId");

        // KEYS: queue, events, nowServing
        List<String> keys = List.of(
                kQueue(clinicId),
                kEvents(clinicId),
                kNowServing(clinicId)
        );
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

        // position=0 to mean "this appointment is now being served"
        return new CallNextResult(clinicId, appointmentId, patientId, 0, nowServing, queueNumber);
    }

    /**
     * Snapshot of caller's current position by appointmentId.
     * This keeps your existing PositionSnapshot type unchanged (clinicId, position, nowServing),
     * and we expose the stable ticket via getQueueNumber(appointmentId) when needed by controller.
     */
    public PositionSnapshot getCurrentPosition(String appointmentId) {
        Objects.requireNonNull(appointmentId, "appointmentId");

        Map<Object, Object> meta = strTpl.opsForHash().entries(kPatient(appointmentId));
        String clinicId = (String) meta.get("clinicId");
        if (clinicId == null) {
            // likely dequeued already
            return new PositionSnapshot(null, 0, 0L, 0L);
        }

        Long rank = strTpl.opsForZSet().rank(kQueue(clinicId), appointmentId);
        int position = (rank == null ? 0 : (int) (rank + 1));

        long nowServing = getNowServingSeqSafe(clinicId);
        long queueNumber = parseLongSafe((String) meta.get("seq"), 0L);   // NEW

        return new PositionSnapshot(clinicId, position, nowServing, queueNumber);
    }

    // Resets now Serving and seq
    public void resetQnumber(String clinicId) {
        Objects.requireNonNull(clinicId, "clinicId cannot be null");
        strTpl.opsForValue().set(kSeq(clinicId), "0");
        strTpl.opsForValue().set(kNowServing(clinicId), "0");
    }

    /** Aggregate status for a clinic queue. */
    public QueueStatus getQueueStatus(String clinicId) {
        Objects.requireNonNull(clinicId, "clinicId");
        Long waiting = strTpl.opsForZSet().zCard(kQueue(clinicId));
        long nowServing = getNowServingSeqSafe(clinicId);
        return new QueueStatus(clinicId, nowServing, waiting == null ? 0 : waiting.intValue());
    }

    /** Stable ticket number for an appointment (seq stored in the hash). */
    public long getQueueNumber(String appointmentId) {
        String seq = (String) strTpl.opsForHash().get(kPatient(appointmentId), "seq");
        return parseLongSafe(seq, 0L);
    }

    /** List all clinics that have registered activity. */
    public Set<String> listClinics() {
        Set<String> clinics = strTpl.opsForSet().members(KEY_CLINICS);
        return (clinics == null) ? Set.of() : clinics;
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
}
