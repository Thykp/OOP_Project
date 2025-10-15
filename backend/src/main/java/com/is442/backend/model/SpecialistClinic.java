
package com.is442.backend.model;


import jakarta.persistence.*;

@Entity
@Table(name = "specialist_clinic")
public class SpecialistClinic {

    @Id
    @Column(name = "\"S_n\"")
    private Integer sn;

    @Column(name = "\"Ihp_clinic_id\"", nullable = false)
    private String ihpClinicId;

    @Column(name = "\"Region\"")
    private String region;

    @Column(name = "\"Area\"")
    private String area;

    @Column(name = "\"Clinic_name\"", nullable = false)
    private String clinicName;

    @Column(name = "\"Address\"", columnDefinition = "text", nullable = false)
    private String address;

    @Column(name = "\"Telephone_num\"")
    private String telephoneNum;

    @Column(name = "\"Mon_to_fri_am\"")
    private String monToFriAm;

    @Column(name = "\"Mon_to_fri_pm\"")
    private String monToFriPm;

    @Column(name = "\"Mon_to_fri_night\"")
    private String monToFriNight;

    @Column(name = "\"Sat_am\"")
    private String satAm;

    @Column(name = "\"Sat_pm\"")
    private String satPm;

    @Column(name = "\"Sat_night\"")
    private String satNight;

    @Column(name = "\"Sun_am\"")
    private String sunAm;

    @Column(name = "\"Sun_pm\"")
    private String sunPm;

    @Column(name = "\"Sun_night\"")
    private String sunNight;

    @Column(name = "\"Public_holiday_am\"")
    private String publicHolidayAm;

    @Column(name = "\"Public_holiday_pm\"")
    private String publicHolidayPm;

    @Column(name = "\"Public_holiday_night\"")
    private String publicHolidayNight;

    @Column(name = "\"Remarks\"", columnDefinition = "text")
    private String remarks;

    @Column(name = "\"Speciality\"")
    private String speciality;

    public Integer getSn() { return sn; }
    public void setSn(Integer sn) { this.sn = sn; }

    public String getIhpClinicId() { return ihpClinicId; }
    public void setIhpClinicId(String ihpClinicId) { this.ihpClinicId = ihpClinicId; }

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }

    public String getArea() { return area; }
    public void setArea(String area) { this.area = area; }

    public String getClinicName() { return clinicName; }
    public void setClinicName(String clinicName) { this.clinicName = clinicName; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getTelephoneNum() { return telephoneNum; }
    public void setTelephoneNum(String telephoneNum) { this.telephoneNum = telephoneNum; }

    public String getMonToFriAm() { return monToFriAm; }
    public void setMonToFriAm(String monToFriAm) { this.monToFriAm = monToFriAm; }

    public String getMonToFriPm() { return monToFriPm; }
    public void setMonToFriPm(String monToFriPm) { this.monToFriPm = monToFriPm; }

    public String getMonToFriNight() { return monToFriNight; }
    public void setMonToFriNight(String monToFriNight) { this.monToFriNight = monToFriNight; }

    public String getSatAm() { return satAm; }
    public void setSatAm(String satAm) { this.satAm = satAm; }

    public String getSatPm() { return satPm; }
    public void setSatPm(String satPm) { this.satPm = satPm; }

    public String getSatNight() { return satNight; }
    public void setSatNight(String satNight) { this.satNight = satNight; }

    public String getSunAm() { return sunAm; }
    public void setSunAm(String sunAm) { this.sunAm = sunAm; }

    public String getSunPm() { return sunPm; }
    public void setSunPm(String sunPm) { this.sunPm = sunPm; }

    public String getSunNight() { return sunNight; }
    public void setSunNight(String sunNight) { this.sunNight = sunNight; }

    public String getPublicHolidayAm() { return publicHolidayAm; }
    public void setPublicHolidayAm(String publicHolidayAm) { this.publicHolidayAm = publicHolidayAm; }

    public String getPublicHolidayPm() { return publicHolidayPm; }
    public void setPublicHolidayPm(String publicHolidayPm) { this.publicHolidayPm = publicHolidayPm; }

    public String getPublicHolidayNight() { return publicHolidayNight; }
    public void setPublicHolidayNight(String publicHolidayNight) { this.publicHolidayNight = publicHolidayNight; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getSpeciality() { return speciality; }
    public void setSpeciality(String speciality) { this.speciality = speciality; }
}
