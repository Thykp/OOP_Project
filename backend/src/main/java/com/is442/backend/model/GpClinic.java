package com.is442.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "gp_clinic")
public class GpClinic extends Clinic {

    @Id
    @Column(name = "s_n")
    private Integer sn;

    @Column(name = "pcn")
    private String pcn;

    @Column(name = "clinic_id")
    private String clinicId;

    @Column(name = "opening_hours")
    private String openingHours;

    @Column(name = "closing_hours")
    private String closingHours;

    public GpClinic() {
    }

    public GpClinic(Integer sn, String clinicId, String clinicName, String address, String telephoneNum, String pcn, String openingHours, String closingHours) {
        super(clinicName, address, telephoneNum);
        this.sn = sn;
        this.clinicId = clinicId;
        this.pcn = pcn;
        this.openingHours = openingHours;
        this.closingHours = closingHours;
    }

    public Integer getSn() {
        return sn;
    }

    public void setSn(Integer sn) {
        this.sn = sn;
    }

    public String getPcn() {
        return pcn;
    }

    public void setPcn(String pcn) {
        this.pcn = pcn;
    }

    public String getClinicId() {
        return clinicId;
    }

    public void setClinicId(String clinicId) {
        this.clinicId = clinicId;
    }

    public String getOpeningHours() {
        return openingHours;
    }

    public String getClosingHours() {
        return closingHours;
    }

    public void setOpeningHours(String openingHours) {
        this.openingHours = openingHours;
    }

    public void setClosingHours(String closingHours) {
        this.closingHours = closingHours;
    }

}
