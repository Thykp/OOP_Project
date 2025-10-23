package com.is442.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.is442.backend.model.Appointment;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

public class AppointmentResponse {

    @JsonProperty("appointment_id")
    private UUID appointmentId;

    @JsonProperty("patient_id")
    private String patientId;

    @JsonProperty("doctor_id")
    private String doctorId;

    @JsonProperty("clinic_id")
    private String clinicId;

    @JsonProperty("booking_date")
    private LocalDate bookingDate;

    @JsonProperty("start_time")
    private LocalTime startTime;

    @JsonProperty("end_time")
    private LocalTime endTime;

    private String status;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;

    public AppointmentResponse() {
    }

    public AppointmentResponse(Appointment appointment) {
        this.appointmentId = appointment.getAppointmentId();
        this.patientId = appointment.getPatientId();
        this.doctorId = appointment.getDoctorId();
        this.clinicId = appointment.getClinicId();
        this.bookingDate = appointment.getBookingDate();
        this.startTime = appointment.getStartTime();
        this.endTime = appointment.getEndTime();
        this.status = appointment.getStatus();
        this.createdAt = appointment.getCreatedAt();
        this.updatedAt = appointment.getUpdatedAt();
    }

    public UUID getAppointmentId() {
        return appointmentId;
    }

    public void setAppointmentId(UUID appointmentId) {
        this.appointmentId = appointmentId;
    }

    public String getPatientId() {
        return patientId;
    }

    public void setPatientId(String patientId) {
        this.patientId = patientId;
    }

    public String getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(String doctorId) {
        this.doctorId = doctorId;
    }

    public String getClinicId() {
        return clinicId;
    }

    public void setClinicId(String clinicId) {
        this.clinicId = clinicId;
    }

    public LocalDate getBookingDate() {
        return bookingDate;
    }

    public void setBookingDate(LocalDate bookingDate) {
        this.bookingDate = bookingDate;
    }

    public LocalTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalTime startTime) {
        this.startTime = startTime;
    }

    public LocalTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalTime endTime) {
        this.endTime = endTime;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
