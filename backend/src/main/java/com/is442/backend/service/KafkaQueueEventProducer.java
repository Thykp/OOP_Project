package com.is442.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.is442.backend.dto.QueueEvent;

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
        try {
            String json = om.writeValueAsString(evt);
            kafkaTemplate.send(TOPIC_NAME, evt.clinicId(), json);
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
    //   new QueueEvent("POSITION_CHANGED", clinicId, appointmentId, patientId, 5, System.currentTimeMillis())
    // );

    //    notificationProducer.publish(
    //            new NotificationEvent("N3_AWAY", "clinic-001", "<appt-id>", "<patient-id>", "EMAIL",
    //                                          "{\"subject\":\"You’re 3 away\",\"body\":\"Please return to the waiting area.\"}", System.currentTimeMillis())
    //            );

}
