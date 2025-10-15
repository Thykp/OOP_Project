package com.is442.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "gp_clinic")
public class GpClinic {

    @Id
    @Column(name = "\"S/N\"")  
    private Integer sn;

    @Column(name = "\"PCN\"")
    private String pcn;

    @Column(name = "\"Clinic_name\"")
    private String clinicName;

    @Column(name = "\"Address\"", columnDefinition = "text")
    private String address;

    @Column(name = "\"Telephone_num\"")
    private String telephoneNum;

    public Integer getSn() { return sn; }
    public void setSn(Integer sn) { this.sn = sn; }

    public String getPcn() { return pcn; }
    public void setPcn(String pcn) { this.pcn = pcn; }

    public String getClinicName() { return clinicName; }
    public void setClinicName(String clinicName) { this.clinicName = clinicName; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getTelephoneNum() { return telephoneNum; }
    public void setTelephoneNum(String telephoneNum) { this.telephoneNum = telephoneNum; }
}
