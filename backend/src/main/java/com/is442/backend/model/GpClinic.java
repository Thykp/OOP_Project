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

    public GpClinic() {}

    public GpClinic(Integer sn, String clinicId, String clinicName, String address, String telephoneNum, String pcn) {
        super(clinicName, address, telephoneNum);
        this.sn = sn;
        this.clinicId = clinicId;
        this.pcn = pcn;
    }

    public Integer getSn() { return sn; }
    public void setSn(Integer sn) { this.sn = sn; }
    public String getPcn() { return pcn; }
    public void setPcn(String pcn) { this.pcn = pcn; }

    public String getClinicId() { return clinicId; }
    public void setClinicId(String clinicId) { this.clinicId = clinicId; }

}
