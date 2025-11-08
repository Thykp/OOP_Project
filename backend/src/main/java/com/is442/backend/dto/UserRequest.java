package com.is442.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class UserRequest {
     @NotNull(message = "Supabase user ID is required")
    @JsonProperty("supabase_user_id")
    private UUID supabaseUserId;

    @NotNull(message = "Email is required")
    @JsonProperty("email")
    private String email;

    @NotNull(message = "First name is required")
    @JsonProperty("first_name")
    private String firstName;

    @NotNull(message = "Last name is required")
    @JsonProperty("last_name")
    private String lastName;

    @NotNull(message = "Role is required")
    @JsonProperty("role")
    private String role;

    // Getters and setters

    public UUID getSupabaseUserId() {
        return supabaseUserId;
    }

    public void setSupabaseUserId(UUID supabaseUserId) {
        this.supabaseUserId = supabaseUserId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
    
}
