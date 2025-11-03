package com.is442.backend.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.validation.constraints.NotNull;

public class RescheduleRequest {

    @NotNull(message = "Doctor ID is required")
    @JsonProperty("doctor_id")
    private String doctorId;

    @NotNull(message = "Clinic ID is required")
    @JsonProperty("clinic_id")
    private String clinicId;

    @NotNull(message = "Booking date is required")
    @JsonProperty("booking_date")
    private LocalDate bookingDate;

    @NotNull(message = "Start time is required")
    @JsonProperty("start_time")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    @JsonProperty("end_time")
    private LocalTime endTime;

    public RescheduleRequest() {
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
}

