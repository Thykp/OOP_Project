package com.is442.backend.dto;

/**
 * @param position   0 when being served
 * @param nowServing the actual ticket number being served (from Redis)
 */
public record CallNextResult(
        String clinicId,
        String appointmentId,
        String patientId,
        int position,
        long nowServing // NEW
) {
    public static CallNextResult empty(String clinicId) {
        return new CallNextResult(clinicId, null, null, 0, 0L); // CHANGED
    }
}



