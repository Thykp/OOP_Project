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
import java.util.UUID;

/**
 * Queue semantics:
 * - Enqueue: INCR seq, ZADD queue member=appointmentId score=seq, HSET
 * patient:{appointmentId} {..., seq}
 * - Position = ZRANK(queue, appointmentId) + 1
 * - Call next: Lua script does ZPOPMIN + HGETALL + DEL + XADD (atomic)
 * - nowServing = last served seq (stored in clinic:{id}:nowServing)
 */
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

    private final StringRedisTemplate strTpl; // strings & ZSET ops
    private final RedisTemplate<String, Object> jsonTpl; // JSON values (optional use)
    private final DefaultRedisScript<List> dequeueScript; // injected Lua dequeue

    @Autowired
    private UserService userService;

    public RedisQueueService(StringRedisTemplate strTpl,
            RedisTemplate<String, Object> jsonTpl,
            DefaultRedisScript<List> dequeueScript) {
        this.strTpl = strTpl;
        this.jsonTpl = jsonTpl;
        this.dequeueScript = dequeueScript;
    }

    /** Check a patient into a clinic queue. Returns numeric position (1-based). */
    public int checkIn(String clinicId, String appointmentId, String patientId) {
        Objects.requireNonNull(clinicId, "clinicId cannot be null");
        Objects.requireNonNull(patientId, "patientId cannot be null");
        Objects.requireNonNull(appointmentId, "appointmentId cannot be null");

        // Get User Data based on user id
        User user = userService.findBySupabaseUserId(UUID.fromString(patientId));

        // 1) allocate next sequence (FIFO ticket)
        long seq = Optional.ofNullable(strTpl.opsForValue().increment(kSeq(clinicId))).orElse(1L);

        // 2) store patient metadata (HASH)
        Map<String, String> meta = new LinkedHashMap<>();
        meta.put("appointmentId", appointmentId);
        meta.put("patientId", patientId);
        meta.put("clinicId", clinicId);
        meta.put("seq", String.valueOf(seq));
        meta.put("phone", user.getPhone());
        meta.put("email", user.getEmail());
        meta.put("name", user.getFirstName() + " " + user.getLastName());
        meta.put("createdAt", Instant.now().toString());
        strTpl.opsForHash().putAll(kPatient(appointmentId), meta);

        // 3) enqueue in ZSET with seq as score
        strTpl.opsForZSet().add(kQueue(clinicId), appointmentId, (double) seq);

        // 4) compute 1-based position via ZRANK
        Long rank = strTpl.opsForZSet().rank(kQueue(clinicId), appointmentId);
        int position = (rank == null ? 0 : (int) (rank + 1));

        // 5) optional: register clinic id for dashboards
        strTpl.opsForSet().add(KEY_CLINICS, clinicId);

        return position;
    }

    /** Dequeue the next patient atomically via Lua. */
    public CallNextResult callNext(String clinicId) {
        Objects.requireNonNull(clinicId, "clinicId");

        List<String> keys = List.of(kQueue(clinicId), kEvents(clinicId));
        List<String> args = List.of("patient:"); // prefix expected by Lua

        List<?> res = strTpl.execute(dequeueScript, keys, args.toArray());
        if (res.isEmpty() || Boolean.FALSE.equals(res.get(0))) {
            return CallNextResult.empty(clinicId);
        }

        // res format: [ appointmentId, k1, v1, k2, v2, ... ]
        String appointmentId = (String) res.get(0);
        Map<String, String> fields = new LinkedHashMap<>();
        for (int i = 1; i + 1 < res.size(); i += 2) {
            fields.put((String) res.get(i), (String) res.get(i + 1));
        }

        String patientId = fields.getOrDefault("patientId", "");
        long servedSeq = parseLongSafe(fields.get("seq"), 0L);

        if (servedSeq > 0) {
            strTpl.opsForValue().set(kNowServing(clinicId), String.valueOf(servedSeq));
        }

        // Once dequeued, position is 0 (being served)
        return new CallNextResult(clinicId, appointmentId, patientId, 0);
    }

    /** Snapshot of caller's current position by appointmentId. */
    public PositionSnapshot getCurrentPosition(String appointmentId) {
        Objects.requireNonNull(appointmentId, "appointmentId");

        Map<Object, Object> meta = strTpl.opsForHash().entries(kPatient(appointmentId));
        String clinicId = (String) meta.get("clinicId");

        if (clinicId == null) {
            // Not found in hash; likely already dequeued.
            return new PositionSnapshot(null, 0, 0);
        }

        Long rank = strTpl.opsForZSet().rank(kQueue(clinicId), appointmentId);
        int position = (rank == null ? 0 : (int) (rank + 1));

        long nowServing = getNowServingSeqSafe(clinicId);
        return new PositionSnapshot(clinicId, position, nowServing);
    }

    public void resetQnumber(String clinicId) {
        Objects.requireNonNull(clinicId, "clinicId cannot be null");
        // Reset the sequence counter to 0 for the specified clinic
        strTpl.opsForValue().set(kSeq(clinicId), "0");
    }

    /** Aggregate status for a clinic queue. */
    public QueueStatus getQueueStatus(String clinicId) {
        Objects.requireNonNull(clinicId, "clinicId");

        Long waiting = strTpl.opsForZSet().zCard(kQueue(clinicId));
        long nowServing = getNowServingSeqSafe(clinicId);

        return new QueueStatus(clinicId, nowServing, waiting == null ? 0 : waiting.intValue());
    }

    // Helper Functions
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

    public Set<String> listClinics() {
        Set<String> clinics = strTpl.opsForSet().members("clinics");
        return (clinics == null) ? Set.of() : clinics;
    }

}
