package com.is442.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "doctor")
public class Doctor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonIgnore 
    private Long id;

    @Column(name = "doctor_id")
    private String doctorId; 
    
    @Column(name = "doctor_name")
    private String doctorName;

    @Column(name = "clinic_name")
    private String clinicName;

    @Column(name = "clinic_id")

    private String clinicId;

    @Column(name = "clinic_address")

    private String clinicAddress;

    @Column(name = "speciality")

    private String speciality;

    public Doctor() {}

    public Doctor(String doctorId, String doctorName, String clinicId, String clinicName, String clinicAddress, String speciality) {
        this.doctorId = doctorId;
        this.doctorName = doctorName;
        this.clinicId = clinicId;
        this.clinicName = clinicName;
        this.clinicAddress=clinicAddress;
        this.speciality = speciality;
    }


    public String getDoctorId(){
        return this.doctorId;
    }

    public void setDoctorId(String doctorId){
        this.doctorId = doctorId;
    }


    public String getClinicId(){
        return this.clinicId;
    }

    public void setClinicId(String clinicId){
        this.clinicId = clinicId;
    }


    public String getDoctorName() {
        return doctorName;
    }

    public void setDoctorName(String doctorName) {
        this.doctorName = doctorName;
    }

    public String getClinicAddress() { 
        return clinicAddress;
    }

    public void setClinicAddress(String clinicAddress) { 
        this.clinicAddress = clinicAddress;
    }

    public String getClinicName() {
        return clinicName;
    }

    public void setClinicName(String clinicName) {
        this.clinicName = clinicName;
    }

    public String getSpeciality() {
        return speciality;
    }

    public void setSpeciality(String speciality) {
        this.speciality = speciality;
    }
}
