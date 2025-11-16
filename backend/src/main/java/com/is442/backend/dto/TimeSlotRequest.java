package com.is442.backend.dto;

public class TimeSlotRequest {
    private String doctorId;
    private String doctorName;
    private String dayOfWeek;
    private String startTime; // Accept as string "HH:mm" or "HH:mm:ss"
    private String endTime;   // Accept as string "HH:mm" or "HH:mm:ss"

    public TimeSlotRequest() {
    }

    public TimeSlotRequest(String doctorId, String doctorName, String dayOfWeek, String startTime, String endTime) {
        this.doctorId = doctorId;
        this.doctorName = doctorName;
        this.dayOfWeek = dayOfWeek;
        this.startTime = startTime;
        this.endTime = endTime;
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

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }
}

