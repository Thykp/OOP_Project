package com.is442.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.is442.backend.model.Patient;

public class PatientResponse extends UserResponse {

    @JsonProperty("phone")
    private String phone;

    @JsonProperty("date_of_birth")
    private String dateOfBirth;

    @JsonProperty("gender")
    private String gender;

    // Getters and setters
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public PatientResponse(Patient patient) {
        super(patient); 
        
        // Set patient-specific fields
        this.phone = patient.getPhone();
        this.dateOfBirth = patient.getDateOfBirth();
        this.gender = patient.getGender();
    }
}
