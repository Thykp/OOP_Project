package com.is442.backend.controller;

import com.is442.backend.service.KafkaQueueEventProducer;
import com.is442.backend.service.RedisQueueService;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.*;
import com.is442.backend.dto.QueueEvent;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/redis-queue")
public class RedisQueueController {

    private final RedisQueueService redisQueueService;
    private final KafkaQueueEventProducer events;

    // contructor
    public RedisQueueController(RedisQueueService redisQueueService,
            @Nullable KafkaQueueEventProducer events) {
        this.redisQueueService = redisQueueService;
        this.events = events;
    }

    // POST endpoint checkin
    @PostMapping("/checkin")
    public Map<String, Object> checkin(@RequestBody Map<String, Object> body) {
        String clinicId = String.valueOf(body.get("clinicId"));
        Object appointmentIdObj = body.get("appointmentId");
        String appointmentId = (appointmentIdObj != null && !String.valueOf(appointmentIdObj).equals("null")
                && !String.valueOf(appointmentIdObj).isEmpty())
                        ? String.valueOf(appointmentIdObj)
                        : UUID.randomUUID().toString();
        String patientId = String.valueOf(body.get("patientId"));

        int position = redisQueueService.checkIn(clinicId, appointmentId, patientId);

        // Publish real-time event
        if (events != null) {
            events.publishQueueEvent(new QueueEvent(
                    "POSITION_CHANGED", clinicId, appointmentId, patientId, position,
                    System.currentTimeMillis()));
        }

        return Map.of("status", "ok", "position", position, "appointmentId", appointmentId);
    }

    // POST endpoint
    @PostMapping("/call-next")
    public Map<String, Object> callNext(@RequestBody Map<String, Object> body) {
        String clinicId = (String) body.get("clinicId");

        var result = redisQueueService.callNext(clinicId);

        if (events != null) {
            events.publishQueueEvent(new QueueEvent(
                    "NOW_SERVING",
                    clinicId,
                    result.appointmentId(),
                    result.patientId(),
                    (int) result.nowServing(),              // CHANGED: publish actual ticket
                    System.currentTimeMillis()
            ));
        }

        return Map.of(
                "status", "ok",
                "nowServing", result.nowServing(),          // CHANGED: return real ticket number
                "appointmentId", result.appointmentId()
        );

    }

    // GET endpoint
    @GetMapping("/me")
    public Map<String, Object> myPosition(@RequestParam String appointmentId) {
        var snapshot = redisQueueService.getCurrentPosition(appointmentId);
        return Map.of("clinicId", snapshot.getClinicId(),
                "position", snapshot.getPosition(),
                "nowServing", snapshot.getNowServing());
    }

    // GET endpoint
    @GetMapping("/status/{clinicId}")
    public Map<String, Object> queueStatus(@PathVariable String clinicId) {
        var status = redisQueueService.getQueueStatus(clinicId);
        return Map.of("clinicId", status.getClinicId(),
                "nowServing", status.getNowServing(),
                "totalWaiting", status.getTotalWaiting());
    }

    // Reset Queue Number
    @GetMapping("/reset/{clinicId}")
    public Map<String, Object> resetQnumber(@PathVariable String clinicId) {
        redisQueueService.resetQnumber(clinicId);
        return Map.of("status", "ok");
    }
}