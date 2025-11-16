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
    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(String dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public PatientResponse(Patient patient) {
        super(patient);

        // Set patient-specific fields
        // Note: Patient has its own phone field (in patient table), but User base class also has phone (in users table)
        // Patient.getPhone() returns Patient's phone field. If it's null, we should check User's phone.
        // However, since Patient overrides getPhone(), we need to access User's phone differently.
        // For now, use Patient's phone field. If it's null, the phone might be in User's table.
        String patientPhone = patient.getPhone();

        // If Patient's phone is null/empty, try to get from User's phone field using reflection
        if (patientPhone == null || patientPhone.trim().isEmpty()) {
            try {
                // Access User's phone field directly since Patient extends User
                // Use reflection to get the User's phone field value
                java.lang.reflect.Field userPhoneField = com.is442.backend.model.User.class.getDeclaredField("phone");
                userPhoneField.setAccessible(true);
                Object userPhoneValue = userPhoneField.get(patient);
                if (userPhoneValue != null && !userPhoneValue.toString().trim().isEmpty()) {
                    this.phone = userPhoneValue.toString();
                } else {
                    this.phone = patientPhone; // null or empty
                }
            } catch (Exception e) {
                // If reflection fails, just use Patient's phone (which is null)
                this.phone = patientPhone;
            }
        } else {
            this.phone = patientPhone;
        }

        this.dateOfBirth = patient.getDateOfBirth();
        this.gender = patient.getGender();
    }
}
