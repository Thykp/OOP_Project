package com.is442.backend.dto;

public class DoctorDto {

    private String doctorId;
    private String doctorName;
    private String clinicName;
    private String clinicAddress;
    private String speciality;
    private String clinicId;


    public DoctorDto(String doctorId, String doctorName, String clinicId, String clinicName, String clinicAddress, String speciality) {
        this.doctorId = doctorId;
        this.doctorName = doctorName;
        this.clinicId = clinicId;
        this.clinicName = clinicName;
        this.clinicAddress = clinicAddress;
        this.speciality = speciality;
    }

    public String getClinicId() {
        return this.clinicId;
    }

    public void setClinicId(String clinicId) {
        this.clinicId = clinicId;
    }


    public String getDoctorId() {
        return doctorId;
    }

    public String getDoctorName() {
        return doctorName;
    }

    public String getClinicName() {
        return clinicName;
    }

    public String getClinicAddress() {
        return clinicAddress;
    }

    public String getSpeciality() {
        return speciality;
    }

    public void setDoctorId(String doctorId) {
        this.doctorId = doctorId;
    }

    public void setDoctorName(String doctorName) {
        this.doctorName = doctorName;
    }

    public void setClinicName(String clinicName) {
        this.clinicName = clinicName;
    }

    public void setClinicAddress(String clinicAddress) {
        this.clinicAddress = clinicAddress;
    }

    public void setSpeciality(String speciality) {
        this.speciality = speciality;
    }


    public String toString() {
        return "DoctorDto{" +
                "doctorId='" + doctorId + '\'' +
                ", doctorName='" + doctorName + '\'' +
                ", clinicName='" + clinicName + '\'' +
                ", clinicAddress='" + clinicAddress + '\'' +
                ", speciality='" + speciality + '\'' +
                '}';
    }


}
