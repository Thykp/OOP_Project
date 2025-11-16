package com.is442.backend.model;

import jakarta.persistence.*;

import java.time.LocalTime;

@MappedSuperclass
public abstract class Clinic {

    @Column(name = "\"Clinic_name\"", nullable = false)
    protected String clinicName;

    @Column(name = "\"Address\"", columnDefinition = "text", nullable = false)
    protected String address;

    @Column(name = "\"Telephone_num\"")
    protected String telephoneNum;

    @Transient
    protected LocalTime openingTime;

    @Transient
    protected LocalTime closingTime;

    public Clinic() {
    }

    public Clinic(String clinicName, String address, String telephoneNum) {
        this.clinicName = clinicName;
        this.address = address;
        this.telephoneNum = telephoneNum;
    }


    public String getClinicName() {
        return clinicName;
    }

    public void setClinicName(String clinicName) {
        this.clinicName = clinicName;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getTelephoneNum() {
        return telephoneNum;
    }

    public void setTelephoneNum(String telephoneNum) {
        this.telephoneNum = telephoneNum;
    }

    public LocalTime getOpeningTime() {
        return openingTime;
    }

    public void setOpeningTime(LocalTime openingTime) {
        this.openingTime = openingTime;
    }

    public LocalTime getClosingTime() {
        return closingTime;
    }

    public void setClosingTime(LocalTime closingTime) {
        this.closingTime = closingTime;
    }
}