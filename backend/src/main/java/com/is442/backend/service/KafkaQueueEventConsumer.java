package com.is442.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.is442.backend.dto.QueueEvent;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class KafkaQueueEventConsumer {

    private final QueueSseService sse;
    private final ObjectMapper om = new ObjectMapper();

    public KafkaQueueEventConsumer(QueueSseService sse) {
        this.sse = sse;
    }

    @KafkaListener(topics = "clinic-queue-updates", groupId = "clinic-queue-group")
    public void listen(String message) {
        try {
            QueueEvent evt = om.readValue(message, QueueEvent.class);
            // broadcast to clinic subscribers
            sse.publishToClinic(evt.clinicId(), message);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
