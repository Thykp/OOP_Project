package com.is442.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.is442.backend.dto.NotificationEvent;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "kafka.enabled", havingValue = "true")   // 👈 Add this line

public class NotificationEventProducer {
    private static final String TOPIC = "notification-events";
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper om = new ObjectMapper();

    public NotificationEventProducer(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publish(NotificationEvent evt) {
        try {
            String json = om.writeValueAsString(evt);
            kafkaTemplate.send(TOPIC, evt.patientId(), json);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
