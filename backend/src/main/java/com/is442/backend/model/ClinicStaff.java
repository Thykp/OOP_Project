package com.is442.backend.model;
import jakarta.persistence.*;


public class ClinicStaff extends User {

    @Column(name = "clinic_name")
    private String clinicName;

    @Column(name = "position")
    private String position; 

    public ClinicStaff() {
        super();
    }

    public ClinicStaff(String supabaseUserId, String email, String firstName, String lastName, String role,
                       String clinicName, String position) {
        super(supabaseUserId, email, firstName, lastName, role);
        this.clinicName = clinicName;
        this.position = position;
    }


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
