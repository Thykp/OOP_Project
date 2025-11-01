package com.is442.backend.dto;

import java.time.LocalTime;

public class TimeSlotDto {
    private Long id;
    private String doctorId;
    private String doctorName;
    private String dayOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
    private boolean isAvailable;

    public TimeSlotDto(Long id, String doctorId, String doctorName, String dayOfWeek, 
                    LocalTime startTime, LocalTime endTime, boolean isAvailable) {
        this.id=id;
        this.doctorId = doctorId;
        this.doctorName = doctorName;
        this.dayOfWeek = dayOfWeek;
        this.startTime = startTime;
        this.endTime = endTime;
        this.isAvailable = isAvailable;
    }

    public Long getTimeSlotId() {
        return id;
    }

    public void setTimeSlotId(Long id) {
        this.id = id;
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

    public String getDayOfWeek() {
        return dayOfWeek;
    }

    public void setDayOfWeek(String dayOfWeek) {
        this.dayOfWeek = dayOfWeek;
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

    public boolean isAvailable() {
        return isAvailable;
    }

    public void setAvailable(boolean available) {
        isAvailable = available;
    }


    
}
