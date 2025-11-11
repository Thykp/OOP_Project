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
    private String monToFriAm;
    private String monToFriPm;
    private String monToFriNight;
    private String satAm;
    private String satPm;
    private String satNight;
    private String sunAm;
    private String sunPm;
    private String sunNight;
    private String publicHolidayAm;
    private String publicHolidayPm;
    private String publicHolidayNight;

    public SpecialistClinicDto() {
    }

public SpecialistClinicDto(
        Integer sn,
        String ihpClinicId,
        String region,
        String area,
        String clinicName,
        String address,
        String telephoneNum,
        String speciality,
        String monToFriAm,
        String monToFriPm,
        String monToFriNight,
        String satAm,
        String satPm,
        String satNight,
        String sunAm,
        String sunPm,
        String sunNight,
        String publicHolidayAm,
        String publicHolidayPm,
        String publicHolidayNight
) {
    this.sn = sn;
    this.ihpClinicId = ihpClinicId;
    this.region = region;
    this.area = area;
    this.clinicName = clinicName;
    this.address = address;
    this.telephoneNum = telephoneNum;
    this.speciality = speciality;
    this.monToFriAm = monToFriAm;
    this.monToFriPm = monToFriPm;
    this.monToFriNight = monToFriNight;
    this.satAm = satAm;
    this.satPm = satPm;
    this.satNight = satNight;
    this.sunAm = sunAm;
    this.sunPm = sunPm;
    this.sunNight = sunNight;
    this.publicHolidayAm = publicHolidayAm;
    this.publicHolidayPm = publicHolidayPm;
    this.publicHolidayNight = publicHolidayNight;
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

    public String getMonToFriAm() {
        return monToFriAm;
    }

    public void setMonToFriAm(String monToFriAm) {
        this.monToFriAm = monToFriAm;
    }

    public String getMonToFriPm() {
        return monToFriPm;
    }

    public void setMonToFriPm(String monToFriPm) {
        this.monToFriPm = monToFriPm;
    }

    public String getMonToFriNight() {
        return monToFriNight;
    }

    public void setMonToFriNight(String monToFriNight) {
        this.monToFriNight = monToFriNight;
    }

    public String getSatAm() {
        return satAm;
    }

    public void setSatAm(String satAm) {
        this.satAm = satAm;
    }

    public String getSatPm() {
        return satPm;
    }

    public void setSatPm(String satPm) {
        this.satPm = satPm;
    }

    public String getSatNight() {
        return satNight;
    }

    public void setSatNight(String satNight) {
        this.satNight = satNight;
    }

    public String getSunAm() {
        return sunAm;
    }

    public void setSunAm(String sunAm) {
        this.sunAm = sunAm;
    }

    public String getSunPm() {
        return sunPm;
    }

    public void setSunPm(String sunPm) {
        this.sunPm = sunPm;
    }

    public String getSunNight() {
        return sunNight;
    }

    public void setSunNight(String sunNight) {
        this.sunNight = sunNight;
    }

    public String getPublicHolidayAm() {
        return publicHolidayAm;
    }

    public void setPublicHolidayAm(String publicHolidayAm) {
        this.publicHolidayAm = publicHolidayAm;
    }

    public String getPublicHolidayPm() {
        return publicHolidayPm;
    }

    public void setPublicHolidayPm(String publicHolidayPm) {
        this.publicHolidayPm = publicHolidayPm;
    }

    public String getPublicHolidayNight() {
        return publicHolidayNight;
    }

    public void setPublicHolidayNight(String publicHolidayNight) {
        this.publicHolidayNight = publicHolidayNight;
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
