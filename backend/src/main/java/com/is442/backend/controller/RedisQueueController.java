package com.is442.backend.controller;

import com.is442.backend.service.KafkaQueueEventProducer;
import com.is442.backend.service.RedisQueueService;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.*;
import com.is442.backend.dto.QueueEvent;
import com.is442.backend.dto.CallNextResult;
import com.is442.backend.dto.PositionSnapshot;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/redis-queue")
public class RedisQueueController {

    private final RedisQueueService redisQueueService;
    private final KafkaQueueEventProducer events;

    public RedisQueueController(RedisQueueService redisQueueService,
                                @Nullable KafkaQueueEventProducer events) {
        this.redisQueueService = redisQueueService;
        this.events = events;
    }

    // POST /checkin — returns dynamic position + stable queueNumber
    @PostMapping("/checkin")
    public Map<String, Object> checkin(@RequestBody Map<String, Object> body) {
        String clinicId = String.valueOf(body.get("clinicId"));

        Object appointmentIdObj = body.get("appointmentId");
        String appointmentId = (appointmentIdObj != null
                && !String.valueOf(appointmentIdObj).equals("null")
                && !String.valueOf(appointmentIdObj).isEmpty())
                ? String.valueOf(appointmentIdObj)
                : UUID.randomUUID().toString();

        String patientId = String.valueOf(body.get("patientId"));

        // Service computes both
        RedisQueueService.CheckinResult result =
                redisQueueService.checkIn(clinicId, appointmentId, patientId);

        // Publish real-time event (keeps same payload shape)
        if (events != null) {
            events.publishQueueEvent(new QueueEvent(
                    "POSITION_CHANGED", clinicId, appointmentId, patientId,
                    result.position(), System.currentTimeMillis()));
        }

        return Map.of(
                "status", "ok",
                "position", result.position(),        // live place in line
                "queueNumber", result.queueNumber(),  // stable ticket (seq)
                "appointmentId", appointmentId
        );
    }

    // POST /call-next — returns the actual nowServing ticket + the dequeued patient's ticket
    @PostMapping("/call-next")
    public Map<String, Object> callNext(@RequestBody Map<String, Object> body) {
        String clinicId = (String) body.get("clinicId");

        CallNextResult result = redisQueueService.callNext(clinicId);

        // Publish event using the actual nowServing ticket number
        if (events != null) {
            events.publishQueueEvent(new QueueEvent(
                    "NOW_SERVING",
                    clinicId,
                    result.appointmentId(),
                    result.patientId(),
                    (int) result.nowServing(),
                    System.currentTimeMillis()
            ));
        }

        return Map.of(
                "status", "ok",
                "nowServing", result.nowServing(),     // clinic-wide current ticket
//                "queueNumber", result.queueNumber(),   // ticket of the dequeued patient
                "appointmentId", result.appointmentId()
        );
    }

    // GET /me — return both position (dynamic), nowServing (clinic-wide), and my queueNumber (stable)
    @GetMapping("/me")
    public Map<String, Object> myPosition(@RequestParam String appointmentId) {
        PositionSnapshot snapshot = redisQueueService.getCurrentPosition(appointmentId);
        long queueNumber = redisQueueService.getQueueNumber(appointmentId);  // stable ticket from hash

        return Map.of(
                "clinicId", snapshot.getClinicId(),
                "position", snapshot.getPosition(),
                "nowServing", snapshot.getNowServing(),
                "queueNumber", queueNumber
        );
    }

    // GET /status/{clinicId} — unchanged API shape
    @GetMapping("/status/{clinicId}")
    public Map<String, Object> queueStatus(@PathVariable String clinicId) {
        var status = redisQueueService.getQueueStatus(clinicId);
        return Map.of(
                "clinicId", status.getClinicId(),
                "nowServing", status.getNowServing(),
                "totalWaiting", status.getTotalWaiting()
        );
    }

    // GET /reset/{clinicId} — soft reset (seq -> 0); optional: also zero nowServing if you want
    @GetMapping("/reset/{clinicId}")
    public Map<String, Object> resetQnumber(@PathVariable String clinicId) {
        redisQueueService.resetQnumber(clinicId);
        return Map.of("status", "ok");
    }
}
