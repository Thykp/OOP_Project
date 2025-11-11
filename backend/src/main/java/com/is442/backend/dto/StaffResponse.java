package com.is442.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.is442.backend.model.ClinicStaff;;

public class StaffResponse extends UserResponse {

    @JsonProperty("clinic_name")
    private String clinicName;

    @JsonProperty("clinic_id")
    private String clinicId;

    @JsonProperty("position")
    private String position;

    // Getters and setters
    public String getClinicName() { return clinicName; }
    public void setClinicName(String clinicName) { this.clinicName = clinicName; }
    public String getClinicId() { return clinicId; }
    public void setClinicId(String clinicId) { this.clinicId = clinicId; }
    public String getPosition() { return position; }
    public void setPosition(String position) { this.position = position; }

    public StaffResponse(ClinicStaff staff) {
        super(staff);
        this.clinicName = staff.getClinicName();
        this.clinicId = staff.getClinicId();
        this.position = staff.getPosition();
    }
}
