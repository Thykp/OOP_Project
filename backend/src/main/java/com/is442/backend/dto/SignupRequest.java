package com.is442.backend.dto;

public class SignupRequest {

    private String supabaseUserId; 
    private String email;
    private String firstName;
    private String lastName;
    private String role; // e.g., "ROLE_PATIENT", "ROLE_STAFF", "ROLE_ADMIN"
    private String phone;
    private String dateOfBirth;
    private String gender;

    // Getters and Setters
    public String getSupabaseUserId() { return supabaseUserId; }
    public void setSupabaseUserId(String supabaseUserId ) { this.supabaseUserId = supabaseUserId; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }

    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(String dateOfBirth) { this.dateOfBirth = dateOfBirth; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
}