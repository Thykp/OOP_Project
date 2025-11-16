package com.is442.backend.dto;

import java.time.LocalTime;

public class GpClinicDto {

    private Integer sn;
    private String pcn;
    private String clinicId;
    private String clinicName;
    private String address;
    private String telephoneNum;
    private String openingHours;
    private String closingHours;

    public GpClinicDto() {
    }

    public GpClinicDto(Integer sn, String clinicId, String pcn, String clinicName, String address, String telephoneNum,
                       String openingHours, String closingHours) {
        this.sn = sn;
        this.clinicId = clinicId;
        this.pcn = pcn;
        this.clinicName = clinicName;
        this.address = address;
        this.telephoneNum = telephoneNum;
        this.openingHours = openingHours;
        this.closingHours = closingHours;
    }

    public Integer getSn() {
        return sn;
    }

    public String getClinicId() {
        return clinicId;
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

    @Override
    public String toString() {
        return "GpClinicDto{" +
                "sn=" + sn +
                ", clinicId=" + clinicId +
                ", pcn='" + pcn + '\'' +
                ", clinicName='" + clinicName + '\'' +
                ", address='" + address + '\'' +
                ", telephoneNum='" + telephoneNum + '\'' +
                ", openingHours='" + openingHours + '\'' +
                ", closingHours='" + closingHours + '\'' +

                '}';
    }
}
