package com.is442.backend.dto;

public class CallNextResult {
    private final String clinicId;
    private final String appointmentId;
    private final String patientId;
    private final int position; // 0 when being served

    public CallNextResult(String clinicId, String appointmentId, String patientId, int position) {
        this.clinicId = clinicId;
        this.appointmentId = appointmentId;
        this.patientId = patientId;
        this.position = position;
    }

    public static CallNextResult empty(String clinicId) {
        return new CallNextResult(clinicId, null, null, 0);
    }

    public String getClinicId() { return clinicId; }
    public String getAppointmentId() { return appointmentId; }
    public String getPatientId() { return patientId; }
    public int getPosition() { return position; }
}

