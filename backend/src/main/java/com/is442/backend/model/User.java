package com.is442.backend.model;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Inheritance;
import jakarta.persistence.InheritanceType;
import jakarta.persistence.Table;

@Entity
@Table(name = "users")
@Inheritance(strategy = InheritanceType.JOINED)

public abstract class User {

    // @GeneratedValue(strategy = GenerationType.IDENTITY)
    // @Column(name = "id")
    // private Long id;

    @Id
    @Column(name = "supabase_user_id")
    private UUID supabaseUserId; // supabase Auth

    @Column(name = "email")
    private String email;

    @Column(name = "first_name")
    private String firstName;

    @Column(name = "last_name")
    private String lastName;

    @Column(name = "role")
    private String role;

    @Column(name = "phone")
    private String phone;

    @Column(name = "status")
    private String status;

    public User() {
    }

    public User(UUID supabaseUserId, String email, String firstName, String lastName, String role, String status) {
        this.supabaseUserId = supabaseUserId;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.role = role;
        this.status = status;
    }

    // public Long getId() {
    // return id;
    // }

    // public void setId(Long id) {
    // this.id = id;
    // }

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

    public String getPhone() {return phone;}

    public void setPhone(String phone) {this.phone = phone;}
    
    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
