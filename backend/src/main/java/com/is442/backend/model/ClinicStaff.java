package com.is442.backend.model;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;


@Entity
@Table(name = "clinic_staff")
@PrimaryKeyJoinColumn(name = "supabase_user_id")
public class ClinicStaff extends User {

    @Column(name = "clinic_name")
    private String clinicName;

    @Column(name = "clinic_id")
    private String clinicId; // new column for stable reference

    @Column(name = "position")
    private String position;

    public ClinicStaff() {
        super();
    }

    public ClinicStaff(UUID supabaseUserId, String email, String firstName, String lastName, String role, String status,
                       String clinicName, String clinicId, String position) {
        super(supabaseUserId, email, firstName, lastName, role, status);
        this.clinicName = clinicName;
        this.clinicId = clinicId;
        this.position = position;
    }


    public String getClinicName() {
        return clinicName;
    }

    public void setClinicName(String clinicName) {
        this.clinicName = clinicName;
    }

    public String getClinicId() {
        return clinicId;
    }

    public void setClinicId(String clinicId) {
        this.clinicId = clinicId;
    }

    public String getPosition() {
        return position;
    }

    public void setPosition(String position) {
        this.position = position;
    }


}
