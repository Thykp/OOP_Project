package com.is442.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;

public class PatientRequest extends UserRequest {

    @NotNull(message = "Phone is required")
    @JsonProperty("phone")
    private String phone;

    @NotNull(message = "Date of birth is required")
    @JsonProperty("date_of_birth")
    private String dateOfBirth;

    @NotNull(message = "Gender is required")
    @JsonProperty("gender")
    private String gender;

    // Getters and setters
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
}
