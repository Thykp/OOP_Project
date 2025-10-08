package com.is442.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "gp_clinic")
public class GpClinic extends Clinic {

    @Id
    @Column(name = "\"S/N\"")  
    private Integer sn;

    @Column(name = "\"PCN\"")
    private String pcn;

    public GpClinic() {}

    public GpClinic(Integer sn, String clinicName, String address, String telephoneNum, String pcn) {
        super(clinicName, address, telephoneNum);  
        this.sn = sn;
        this.pcn = pcn;
    }

    public Integer getSn() { return sn; }
    public void setSn(Integer sn) { this.sn = sn; }

    public String getPcn() { return pcn; }
    public void setPcn(String pcn) { this.pcn = pcn; }

}
