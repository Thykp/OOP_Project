package com.is442.backend.controller;

import com.is442.backend.dto.QueueEvent;
import com.is442.backend.service.KafkaQueueEventProducer;
import com.is442.backend.service.QueueService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import org.springframework.lang.Nullable;

@RestController
@RequestMapping("/api/queue")
public class QueueController {

    private final QueueService queue;
    private final KafkaQueueEventProducer events;

     @Autowired
    public QueueController(QueueService queue, @Nullable KafkaQueueEventProducer events) {
        this.queue = queue;
        this.events = events;
    }


    @PostMapping("/checkin")
    public Map<String, Object> checkin(@RequestBody Map<String, Object> body,
                                       @RequestHeader(value = "Idempotency-Key", required = false) String idem) {
        String clinicId   = (String) body.get("clinicId");
        String apptId     = (String) body.get("appointmentId");
        String patientId  = (String) body.get("patientId");

        int position = queue.checkIn(clinicId, apptId, patientId, idem);

        events.publishQueueEvent(new QueueEvent(
                "POSITION_CHANGED", clinicId, apptId, patientId, position, System.currentTimeMillis()
        ));

        return Map.of("status","ok","position", position);
    }

    @PostMapping("/call-next")
    public Map<String, Object> callNext(@RequestBody Map<String, Object> body) {
        String clinicId = (String) body.get("clinicId");

        var result = queue.callNext(clinicId);
        events.publishQueueEvent(new QueueEvent(
                "NOW_SERVING", clinicId, result.appointmentId(), result.patientId(), result.position(), System.currentTimeMillis()
        ));

        return Map.of("status","ok","nowServing", result.position(), "appointmentId", result.appointmentId());
    }

    @GetMapping("/me")
    public Map<String, Object> myPosition(@RequestParam String appointmentId) {
        var s = queue.currentForAppointment(appointmentId);
        return Map.of("clinicId", s.clinicId(), "position", s.position(), "nowServing", s.nowServing());
    }
}
