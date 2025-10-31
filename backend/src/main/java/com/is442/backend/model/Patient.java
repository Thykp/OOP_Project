package com.is442.backend.model;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import java.util.UUID;



@Entity
@Table(name = "patient")
@PrimaryKeyJoinColumn(name = "supabase_user_id")
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

    public Patient(UUID supabaseUserId, String email, String firstName, String lastName, String role,
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
