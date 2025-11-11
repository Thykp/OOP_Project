package com.is442.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.is442.backend.dto.NotificationEvent;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(name = "kafka.enabled", havingValue = "true")
public class NotificationEmailConsumer {

    private final JavaMailSender mailSender;
    private final ObjectMapper om = new ObjectMapper();

    public NotificationEmailConsumer(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @KafkaListener(
            topics = "notification-events",
            groupId = "notification-emailer"
    )
    public void onEvent(ConsumerRecord<String, String> rec) {
        try {
            // Value is a serialized NotificationEvent
            NotificationEvent evt = om.readValue(rec.value(), NotificationEvent.class);

            // Only handle EMAIL channel for now
            if (!"EMAIL".equalsIgnoreCase(evt.channel())) {
                // future: route to SMS handler
                return;
            }

            // Payload is JSON string with subject, body, and patient.{email}
            JsonNode payload = om.readTree(evt.payload());
            String subject = payload.path("subject").asText("(no subject)");
            String body    = payload.path("body").asText("");
            String to      = payload.path("patient").path("email").asText("");

            if (to == null || to.isBlank()) {
                System.out.printf("[NotificationEmailConsumer] Skipping: empty email for appt %s%n", evt.appointmentId());
                return;
            }

            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(to);
            msg.setFrom("noreply@clinic.local"); // dev sender
            msg.setSubject(subject);
            msg.setText(body + String.format(
                    "%n%nClinic: %s%nDoctor: %s%nQueue #: %s%nAppointment ID: %s",
                    safe(payload, "clinicId"),
                    safe(payload, "doctorName"),
                    payload.path("patient").path("queue_number").asText(""),
                    evt.appointmentId()
            ));

            mailSender.send(msg);
            System.out.printf("[NotificationEmailConsumer] Sent EMAIL '%s' → %s%n", evt.type(), to);

        } catch (Exception e) {
            System.err.println("[NotificationEmailConsumer] Failed to process: " + e.getMessage());
            e.printStackTrace();
        }
    }

    private String safe(JsonNode node, String field) {
        JsonNode n = node.path(field);
        return n.isMissingNode() ? "" : n.asText("");
    }
}
