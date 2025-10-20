
package com.is442.backend.model;


import jakarta.persistence.*;

@Entity
@Table(name = "specialist_clinic")
public class SpecialistClinic extends Clinic {
    @Id
    @Column(name = "s_n")
    private Integer sn;

    @Column(name = "ihp_clinic_id", nullable = false)
    private String ihpClinicId;

    @Column(name = "region")
    private String region;

    @Column(name = "area")
    private String area;

    @Column(name = "mon_to_fri_am")
    private String monToFriAm;

    @Column(name = "mon_to_fri_pm")
    private String monToFriPm;

    @Column(name = "mon_to_fri_night")
    private String monToFriNight;

    @Column(name = "sat_am")
    private String satAm;

    @Column(name = "sat_pm")
    private String satPm;

    @Column(name = "sat_night")
    private String satNight;

    @Column(name = "sun_am")
    private String sunAm;

    @Column(name = "sun_pm")
    private String sunPm;

    @Column(name = "sun_night")
    private String sunNight;

    @Column(name = "public_holiday_am")
    private String publicHolidayAm;

    @Column(name = "public_holiday_pm")
    private String publicHolidayPm;

    @Column(name = "public_holiday_night")
    private String publicHolidayNight;

    @Column(name = "remarks", columnDefinition = "text")
    private String remarks;

    @Column(name = "speciality")
    private String speciality;

    public SpecialistClinic() {}

    public SpecialistClinic(Integer sn, String clinicName, String address, String telephoneNum,
                            String ihpClinicId, String region, String area, String speciality) {
        super(clinicName, address, telephoneNum); 
        this.sn = sn;
        this.ihpClinicId = ihpClinicId;
        this.region = region;
        this.area = area;
        this.speciality = speciality;
    }

    public Integer getSn() { return sn; }
    public void setSn(Integer sn) { this.sn = sn; }

    public String getIhpClinicId() { return ihpClinicId; }
    public void setIhpClinicId(String ihpClinicId) { this.ihpClinicId = ihpClinicId; }

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }

    public String getArea() { return area; }
    public void setArea(String area) { this.area = area; }

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
