package com.is442.backend.service;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.is442.backend.dto.NotificationEvent;

@Service
@ConditionalOnProperty(name = "kafka.enabled", havingValue = "true")
public class NotificationEmailConsumer {

    private final JavaMailSender mailSender;
    private final ObjectMapper om = new ObjectMapper();
    private final String fromAddress;

    public NotificationEmailConsumer(
            JavaMailSender mailSender,
            @Value("${app.mail.from:noreply@clinic.local}") String fromAddress
    ) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
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

            // Payload is JSON string (subject/body still produced, but we
            // now build a richer template body from Appendix A)
            JsonNode payload = om.readTree(evt.payload());
            JsonNode patientNode = payload.path("patient");

            String to = patientNode.path("email").asText("");

            if (to == null || to.isBlank()) {
                System.out.printf(
                        "[NotificationEmailConsumer] Skipping EMAIL: empty email for appt %s%n",
                        evt.appointmentId()
                );
                return;
            }

            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(to);
            msg.setFrom(fromAddress);

            // Fixed subject per Appendix A
            msg.setSubject("Appointment & Queue Update – SingHealth Clinic");

            // Rich body based on event type + payload
            msg.setText(buildTemplateBody(evt, payload));

            mailSender.send(msg);
            System.out.printf(
                    "[NotificationEmailConsumer] Sent EMAIL '%s' → %s%n",
                    evt.type(),
                    to
            );

        } catch (Exception e) {
            System.err.println("[NotificationEmailConsumer] Failed to process: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * Build Appendix A style email:
     *
     * Subject: Appointment & Queue Update – SingHealth Clinic
     * Dear [Patient Name],
     * Thank you for booking your appointment at [Clinic Name].
     *  • Doctor: [Doctor Name]
     *  • Date & Time: [Appointment Date & Time]
     *  • Queue Number: [Queue Number]
     * ...
     * Queue Update Notifications:
     *  • "You are currently 3 patients away..."  (N3_AWAY)
     *  • "It’s your turn. Kindly enter..."      (NOW_SERVING)
     */
    private String buildTemplateBody(NotificationEvent evt, JsonNode payload) {
        JsonNode patientNode = payload.path("patient");

        String patientName = safe(patientNode, "name");
        if (patientName.isBlank()) {
            patientName = "Patient";
        }

        // Try friendly clinic name first, then clinicId, then default
        String clinicName = safe(payload, "clinicName");
        if (clinicName.isBlank()) {
            clinicName = safe(payload, "clinicId");
        }
        if (clinicName.isBlank()) {
            clinicName = "SingHealth Clinic";
        }

        String doctorName = safe(payload, "doctorName");
        if (doctorName.isBlank()) {
            doctorName = "Doctor";
        }

        String queueNumber = safe(patientNode, "queue_number");
        if (queueNumber.isBlank()) {
            queueNumber = "-";
        }

        // Currently not in payload; phrase safely
        String appointmentDateTime = safe(payload, "appointmentDateTime");
        if (appointmentDateTime.isBlank()) {
            appointmentDateTime = "As per your appointment booking";
        }

        // Choose the one-line queue update message based on event type
        String queueUpdateLine;
        String type = evt.type(); // e.g. "N3_AWAY" or "NOW_SERVING"

        if ("N3_AWAY".equalsIgnoreCase(type)) {
            queueUpdateLine =
                    "You are currently 3 patients away. Please proceed closer to the consultation room.";
        } else if ("NOW_SERVING".equalsIgnoreCase(type)) {
            // If you later add room number, inject it here.
            queueUpdateLine =
                    "It’s your turn. Kindly enter the consultation room.";
        } else {
            // Fallback – reuse original body if present, otherwise generic line
            String body = safe(payload, "body");
            queueUpdateLine = body.isBlank()
                    ? "Your queue status has been updated."
                    : body;
        }

        // Final body (Appendix A style)
        return String.format(
                "Dear %s,%n%n" +
                "Thank you for booking your appointment at %s.%n%n" +
                "• Doctor: %s%n" +
                "• Date & Time: %s%n" +
                "• Queue Number: %s%n%n" +
                "We will notify you again when your turn is approaching. " +
                "Please be present at the clinic when your queue number is called.%n%n" +
                "Queue Update Notifications:%n" +
                "• %s%n%n" +
                "We look forward to serving you.%n%n" +
                "Warm regards,%n" +
                "SingHealth Clinic Team%n",
                patientName,
                clinicName,
                doctorName,
                appointmentDateTime,
                queueNumber,
                queueUpdateLine
        );
    }

    private String safe(JsonNode node, String field) {
        if (node == null) {
            return "";
        }
        JsonNode n = node.path(field);
        return n.isMissingNode() || n.isNull() ? "" : n.asText("");
    }
}
