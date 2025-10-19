package com.is442.backend.dto;

public record NotificationEvent(
        String type,        // "N3_AWAY", "NOW_SERVING"
        String clinicId,
        String appointmentId,
        String patientId,
        String channel,     // "EMAIL" | "SMS" | "PUSH"
        String payload,     // free-form (subject/body or token)
        Long ts
) {}
