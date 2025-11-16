package com.is442.backend.dto;

import java.time.LocalDate;
import java.util.List;

public class AvailableDateSlotsDto {
    private LocalDate date;
    private String doctorId;
    private String doctorName;
    private String clinicId;
    private String clinicName;
    private List<TimeSlotDto> timeSlots;

    public AvailableDateSlotsDto() {
    }

    public AvailableDateSlotsDto(LocalDate date, String doctorId, String doctorName, String clinicId, String clinicName, List<TimeSlotDto> timeSlots) {
        this.date = date;
        this.doctorId = doctorId;
        this.doctorName = doctorName;
        this.clinicId = clinicId;
        this.clinicName = clinicName;
        this.timeSlots = timeSlots;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getDoctorId() {
        return doctorId;
    }

    public void setDoctorId(String doctorId) {
        this.doctorId = doctorId;
    }

    public String getDoctorName() {
        return doctorName;
    }

    public void setDoctorName(String doctorName) {
        this.doctorName = doctorName;
    }

    public String getClinicId() {
        return clinicId;
    }

    public void setClinicId(String clinicId) {
        this.clinicId = clinicId;
    }

    public String getClinicName() {
        return clinicName;
    }

    public void setClinicName(String clinicName) {
        this.clinicName = clinicName;
    }

    public List<TimeSlotDto> getTimeSlots() {
        return timeSlots;
    }

    public void setTimeSlots(List<TimeSlotDto> timeSlots) {
        this.timeSlots = timeSlots;
    }
}
