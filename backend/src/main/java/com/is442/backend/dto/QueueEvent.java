package com.is442.backend.dto;

public record QueueEvent(
        String type,        // "POSITION_CHANGED" | "NOW_SERVING" | "CHECKED_IN" | "SKIPPED"
        String clinicId,
        String appointmentId,
        String patientId,
        Integer position,   // null when not applicable
        Long ts
) {}
