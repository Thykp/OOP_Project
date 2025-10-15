package com.is442.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalTime;

public class TimeSlot {
    
    @JsonProperty("doctor_id")
    private String doctorId;
    
    @JsonProperty("doctor_name")
    private String doctorName;
    
    @JsonProperty("day_of_week")
    private String dayOfWeek;
    
    @JsonProperty("start_time")
    private LocalTime startTime;
    
    @JsonProperty("end_time")
    private LocalTime endTime;
    
    @JsonProperty("available")
    private boolean isAvailable;

    // @JsonProperty("order_index")
    // private Integer orderIndex;


    public TimeSlot() {}

    public TimeSlot(String doctorId, String doctorName, String dayOfWeek, 
                    LocalTime startTime, LocalTime endTime, boolean isAvailable) {
        this.doctorId = doctorId;
        this.doctorName = doctorName;
        this.dayOfWeek = dayOfWeek;
        this.startTime = startTime;
        this.endTime = endTime;
        this.isAvailable = isAvailable;
    }

    // Getters and Setters

    // public Integer getOrderIndex() {
    //     return orderIndex;
    // }

    // public void setOrderIndex(Integer orderIndex) {
    //     this.orderIndex = orderIndex;
    // }

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