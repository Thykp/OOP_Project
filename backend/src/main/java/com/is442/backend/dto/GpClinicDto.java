package com.is442.backend.dto;

public class GpClinicDto {

    private Integer sn;
    private String pcn;
    private String clinicName;
    private String address;
    private String telephoneNum;

    public GpClinicDto(Integer sn, String pcn, String clinicName, String address, String telephoneNum) {
        this.sn = sn;
        this.pcn = pcn;
        this.clinicName = clinicName;
        this.address = address;
        this.telephoneNum = telephoneNum;
    }

    public Integer getSn() {
        return sn;
    }

    public String getPcn() {
        return pcn;
    }

    public String getClinicName() {
        return clinicName;
    }

    public String getAddress() {
        return address;
    }

    public String getTelephoneNum() {
        return telephoneNum;
    }

    @Override
    public String toString() {
        return "GpClinicDto{" +
                "sn=" + sn +
                ", pcn='" + pcn + '\'' +
                ", clinicName='" + clinicName + '\'' +
                ", address='" + address + '\'' +
                ", telephoneNum='" + telephoneNum + '\'' +
                '}';
    }
}
