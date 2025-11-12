package com.is442.backend.dto;

import jakarta.validation.constraints.NotBlank;

public class DoctorRequest {
    
    @NotBlank(message = "Doctor ID is required")
    private String doctorId;
    
    @NotBlank(message = "Doctor name is required")
    private String doctorName;
    
    @NotBlank(message = "Clinic ID is required")
    private String clinicId;
    
    @NotBlank(message = "Clinic name is required")
    private String clinicName;
    
    private String clinicAddress;
    
    @NotBlank(message = "Speciality is required")
    private String speciality;

    public DoctorRequest() {}

    public DoctorRequest(String doctorId, String doctorName, String clinicId, String clinicName, String clinicAddress, String speciality) {
        this.doctorId = doctorId;
        this.doctorName = doctorName;
        this.clinicId = clinicId;
        this.clinicName = clinicName;
        this.clinicAddress = clinicAddress;
        this.speciality = speciality;
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

    public String getClinicAddress() {
        return clinicAddress;
    }

    public void setClinicAddress(String clinicAddress) {
        this.clinicAddress = clinicAddress;
    }

    public String getSpeciality() {
        return speciality;
    }

    public void setSpeciality(String speciality) {
        this.speciality = speciality;
    }
}

