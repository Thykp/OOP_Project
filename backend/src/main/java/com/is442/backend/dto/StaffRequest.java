package com.is442.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;

public class StaffRequest extends UserRequest {

    @NotNull(message = "Clinic name is required")
    @JsonProperty("clinic_name")
    private String clinicName;

    @NotNull(message = "Position is required")
    @JsonProperty("position")
    private String position;

    // Getters and setters
    public String getClinicName() {
        return clinicName;
    }
    public void setClinicName(String clinicName) {
        this.clinicName = clinicName;
    }
    public String getPosition() {
        return position;
    }
    public void setPosition(String position) {
        this.position = position;
    }
}

