package com.is442.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.is442.backend.dto.QueueEvent;

import org.apache.kafka.clients.producer.ProducerRecord;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "kafka.enabled", havingValue = "true")

public class KafkaQueueEventProducer {
    private static final String TOPIC_NAME = "clinic-queue-updates";
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper om = new ObjectMapper();

    public KafkaQueueEventProducer(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publishQueueEvent(QueueEvent evt) {
        publishQueueEvent(evt, null);
    }

    public void publishQueueEvent(QueueEvent evt, String doctorId) {
        try {
            String json = om.writeValueAsString(evt);

            // Create ProducerRecord with headers
            ProducerRecord<String, String> record = new ProducerRecord<>(TOPIC_NAME, evt.clinicId(), json);

            // Add clinicId to headers
            if (evt.clinicId() != null && !evt.clinicId().trim().isEmpty()) {
                record.headers().add("clinicId", evt.clinicId().getBytes());
            }

            // Add doctorId to headers if provided
            if (doctorId != null && !doctorId.trim().isEmpty()) {
                record.headers().add("doctorId", doctorId.getBytes());
            }

            // Send to Kafka
            kafkaTemplate.send(record);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // backward-compat for /test-kafka endpoint
    public void sendQueueUpdate(String message) {
        kafkaTemplate.send(TOPIC_NAME, message);
    }

    // Sample publish:
    // example when position changes to 5
    // producer.publishQueueEvent(
    // new QueueEvent("POSITION_CHANGED", clinicId, appointmentId, patientId, 5,
    // System.currentTimeMillis())
    // );

    // notificationProducer.publish(
    // new NotificationEvent("N3_AWAY", "clinic-001", "<appt-id>", "<patient-id>",
    // "EMAIL",
    // "{\"subject\":\"You’re 3 away\",\"body\":\"Please return to the waiting
    // area.\"}", System.currentTimeMillis())
    // );

}
