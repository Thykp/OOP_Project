package com.is442.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class SlotUpdateDto {

    @JsonProperty("clinic_id")
    private String clinicId;

    @JsonProperty("doctor_id")
    private String doctorId;

    @JsonProperty("booking_date")
    private String bookingDate; // yyyy-MM-dd

    @JsonProperty("start_time")
    private String startTime; // HH:mm:ss

    @JsonProperty("end_time")
    private String endTime; // HH:mm:ss

    @JsonProperty("action")
    private String action; // e.g., REMOVE

    public SlotUpdateDto() {}

    public SlotUpdateDto(String clinicId, String doctorId, String bookingDate, String startTime, String endTime, String action) {
        this.clinicId = clinicId;
        this.doctorId = doctorId;
        this.bookingDate = bookingDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.action = action;
    }

    public String getClinicId() { return clinicId; }
    public void setClinicId(String clinicId) { this.clinicId = clinicId; }
    public String getDoctorId() { return doctorId; }
    public void setDoctorId(String doctorId) { this.doctorId = doctorId; }
    public String getBookingDate() { return bookingDate; }
    public void setBookingDate(String bookingDate) { this.bookingDate = bookingDate; }
    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }
    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
}
