package com.is442.backend.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

@Entity
@Table(name = "doctor")
public class Doctor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @JsonIgnore 

    private Long id;

    @Column(name = "doctor_id")
    @JsonProperty("doctor_id")

    
    private String doctorId; 
    
    @Column(name = "doctor_name")
    @JsonProperty("doctor_name")


    private String doctorName;

    @Column(name = "clinic_name")
    @JsonProperty("clinic_name")


    private String clinicName;

    @Column(name = "clinic_address")
    @JsonProperty("clinic_address")


    private String clinicAddress;

    @Column(name = "speciality")
    @JsonProperty("speciality")

    private String speciality;

    public Doctor() {}

    public Doctor(String doctorId, String doctorName, String clinicName,String clinicAddress, String speciality) {
        this.doctorId=doctorId;
        this.doctorName = doctorName;
        this.clinicName = clinicName;
        this.clinicAddress=clinicAddress;
        this.speciality = speciality;
    }


    public String getDoctorId(){
        return this.doctorId;
    }

    public void setdoctorId(String doctorId){
        this.doctorId=doctorId;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getDoctorName() {
        return doctorName;
    }

    public void setName(String doctorName) {
        this.doctorName = doctorName;
    }

    public String getClinicAddress() { 
        return clinicAddress;
     }
    public void setClinicAddress(String clinicAddress) { 
        this.clinicAddress = clinicAddress;
     }

    public String getclinicName() {
        return clinicName;
    }

    public void setclinicName(String clinicName) {
        this.clinicName = clinicName;
    }

    public String getSpeciality() {
        return speciality;
    }

    public void setSpeciality(String speciality) {
        this.speciality = speciality;
    }
}
