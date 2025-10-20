package com.is442.backend.model;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.time.*;
import java.util.UUID;

@Entity
@Table(name = "appointment")
public class Appointment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "appointment_id")
    @JsonProperty("appointment_id")
    private UUID appointmentId;

    @Column(name = "patient_id", nullable = false)
    @JsonProperty("patient_id")
    private String patientId;

    @Column(name = "doctor_id", nullable = false)
    @JsonProperty("doctor_id")
    private String doctorId;

    @Column(name = "clinic_id", nullable = false)
    @JsonProperty("clinic_id")
    private String clinicId;

    @Column(name = "booking_date", nullable = false)
    @JsonProperty("booking_date")
    private LocalDate bookingDate;

    @Column(name = "start_time", nullable = false)
    @JsonProperty("start_time")
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    @JsonProperty("end_time")
    private LocalTime endTime;

    @Column(name = "status", nullable = false)
    private String status = "SCHEDULED";

    @Column(name = "created_at", updatable = false)
    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;

    public Appointment() {
    }

    public Appointment(String patientId, String doctorId, String clinicId, 
                      LocalDate bookingDate, LocalTime startTime, LocalTime endTime) {
        this.patientId = patientId;
        this.doctorId = doctorId;
        this.clinicId = clinicId;
        this.bookingDate = bookingDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.status = "SCHEDULED";
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
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
