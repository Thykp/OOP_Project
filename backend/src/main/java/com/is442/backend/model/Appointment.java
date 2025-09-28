package com.is442.backend.model;
import jakarta.persistence.*;
import java.util.*;
import java.time.*;

@Entity
@Table(name="appointments")
public class Appointment {
    @Id
    @Column(name="appointmentId")
    private UUID appointmentId;

    @Column(name="createdAt")
    private LocalDateTime createdAt;

    @Column(name="userId")
    private UUID userId;

    @Column(name="doctor")
    private String doctor;

    @Column(name="clinic")
    private String clinic;

    @Column(name="date")
    private LocalDate date;

    @Column(name="time")
    private LocalTime time;

    public UUID getAppointmentId(){
        return appointmentId;
    }
    public LocalDateTime getCreatedAt(){
        return createdAt;
    }
    public UUID userId(){
        return userId;
    }
    public String doctor(){
        return doctor;
    }
    public String clinic(){
        return clinic;
    }
    public LocalDate date(){
        return date;
    }
    public LocalTime time(){
        return time;
    }

    public void setAppointmentId(UUID appointmentId){
        this.appointmentId = appointmentId;
    }
    public void setCreatedAt(LocalDateTime createdAt){
        this.createdAt = createdAt;
    }
    public void setUserId(UUID userId){
        this.userId = userId;
    }
    public void setDoctor(String doctor){
        this.doctor = doctor;
    }
    public void setClinic(String clinic){
        this.clinic = clinic;
    }
    public void setDate(LocalDate date){
        this.date = date;
    }
    public void setTime(LocalTime time){
        this.time= time;
    }
}
