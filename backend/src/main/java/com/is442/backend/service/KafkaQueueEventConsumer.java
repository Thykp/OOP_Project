package com.is442.backend.service;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class KafkaQueueEventConsumer {

    private final QueueSseService sse;

    public KafkaQueueEventConsumer(QueueSseService sse) {
        this.sse = sse;
    }

    @KafkaListener(topics = "clinic-queue-updates", groupId = "clinic-queue-group")
    public void listen(String message) {
        // message expected to include clinicId (we’ll send it that way from the producer)
        // naive route: parse clinicId out; for now we assume FE or producer provides it
        // If you prefer, switch to Jackson and map to QueueEvent.
        String clinicId = extractClinicId(message); // TODO: implement a tiny parser or use Jackson

        // Broadcast to FE subscribers of that clinic
        sse.publishToClinic(clinicId, message);
    }

    // Quick placeholder for now; will replace with a proper JSON parse using Jackson or something else
    private String extractClinicId(String json) {
        int i = json.indexOf("\"clinicId\"");
        if (i < 0) return "unknown";
        int colon = json.indexOf(':', i);
        int quote1 = json.indexOf('"', colon + 1);
        int quote2 = json.indexOf('"', quote1 + 1);
        return (quote1 > 0 && quote2 > quote1) ? json.substring(quote1 + 1, quote2) : "unknown";
    }
}
