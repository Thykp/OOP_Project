package com.is442.backend.dto;

public class SpecialistClinicDto {

    private Integer sn;
    private String ihpClinicId;
    private String region;
    private String area;
    private String clinicName;
    private String address;
    private String telephoneNum;
    private String speciality;

    public SpecialistClinicDto(Integer sn, String ihpClinicId, String region, String area,
                               String clinicName, String address, String telephoneNum, String speciality) {
        this.sn = sn;
        this.ihpClinicId = ihpClinicId;
        this.region = region;
        this.area = area;
        this.clinicName = clinicName;
        this.address = address;
        this.telephoneNum = telephoneNum;
        this.speciality = speciality;
    }

    public Integer getSn() {
        return sn;
    }

    public String getIhpClinicId() {
        return ihpClinicId;
    }

    public String getRegion() {
        return region;
    }

    public String getArea() {
        return area;
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

    public String getSpeciality() {
        return speciality;
    }

    @Override
    public String toString() {
        return "SpecialistClinicDto{" +
                "sn=" + sn +
                ", ihpClinicId='" + ihpClinicId + '\'' +
                ", region='" + region + '\'' +
                ", area='" + area + '\'' +
                ", clinicName='" + clinicName + '\'' +
                ", address='" + address + '\'' +
                ", telephoneNum='" + telephoneNum + '\'' +
                ", speciality='" + speciality + '\'' +
                '}';
    }
}
