package com.is442.backend.controller;

import com.is442.backend.service.KafkaQueueEventProducer;
import com.is442.backend.service.RedisQueueService;
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
                                KafkaQueueEventProducer events) {
        this.redisQueueService = redisQueueService;
        this.events = events;
    }

    // POST endpoint checkin
    @PostMapping("/checkin")
    public Map<String, Object> checkin(@RequestBody Map<String, Object> body) {
        String clinicId = String.valueOf(body.get("clinicId"));
        String appointmentId = String.valueOf(body.get("appointmentId"));
        String patientId = String.valueOf(body.get("patientId"));

        appointmentId = (appointmentId != null && !appointmentId.isEmpty())
                ? appointmentId
                : UUID.randomUUID().toString();

        int position = redisQueueService.checkIn(clinicId, appointmentId, patientId);

        // Publish real-time event
        events.publishQueueEvent(new QueueEvent(
                "POSITION_CHANGED", clinicId, appointmentId, patientId, position,
                System.currentTimeMillis()
        ));

        return Map.of("status", "ok", "position", position);
    }

    // POST endpoint
    @PostMapping("/call-next")
    public Map<String, Object> callNext(@RequestBody Map<String, Object> body) {
        String clinicId = (String) body.get("clinicId");

        var result = redisQueueService.callNext(clinicId);

        // Publish real-time event
        events.publishQueueEvent(new QueueEvent(
                "NOW_SERVING", clinicId, result.getAppointmentId(),
                result.getPatientId(), result.getPosition(), System.currentTimeMillis()
        ));

        return Map.of("status", "ok", "nowServing", result.getPosition(),
                "appointmentId", result.getAppointmentId());
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
}