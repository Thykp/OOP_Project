package com.is442.backend.dto;

/**
 * @param position    0 when being served
 * @param nowServing  the clinic-wide ticket number being served (from Redis)
 * @param queueNumber the dequeued patient's own ticket (seq)
 */
public record CallNextResult(
        String clinicId,
        String appointmentId,
        String patientId,
        int position,
        long nowServing,
        long queueNumber
) {
    public static CallNextResult empty(String clinicId) {
        return new CallNextResult(clinicId, null, null, 0, 0L, 0L);
    }
}