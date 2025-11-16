package com.is442.backend.dto;

public class TreatmentNoteRequest {
    private String appointmentId;
    private String noteType; // TREATMENT_SUMMARY | FOLLOW_UP | PRESCRIPTION | OTHER
    private String notes;

    public TreatmentNoteRequest() {
    }

    public TreatmentNoteRequest(String appointmentId, String noteType, String notes) {
        this.appointmentId = appointmentId;
        this.noteType = noteType;
        this.notes = notes;
    }

    public String getAppointmentId() {
        return appointmentId;
    }

    public void setAppointmentId(String appointmentId) {
        this.appointmentId = appointmentId;
    }

    public String getNoteType() {
        return noteType;
    }

    public void setNoteType(String noteType) {
        this.noteType = noteType;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}

