package com.is442.backend.model;
import jakarta.persistence.*;


@Entity
@Table(name = "patient")
public class Patient extends User{
    @Column(name = "phone")
    private String phone;

    @Column(name = "date_of_birth")
    private String dateOfBirth;

    @Column(name = "gender")
    private String gender;

    public Patient() {
        super();
    }

    public Patient(String supabaseUserId, String email, String firstName, String lastName, String role,
                   String phone, String dateOfBirth, String gender) {
        super(supabaseUserId, email, firstName, lastName, role);
        this.phone = phone;
        this.dateOfBirth = dateOfBirth;
        this.gender = gender;
    }

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


    
}
