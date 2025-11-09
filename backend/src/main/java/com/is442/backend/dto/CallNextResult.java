package com.is442.backend.dto;

/**
 * @param position 0 when being served
 */
public record CallNextResult(String clinicId, String appointmentId, String patientId, int position) {

    public static CallNextResult empty(String clinicId) {
        return new CallNextResult(clinicId, null, null, 0);
    }
}

