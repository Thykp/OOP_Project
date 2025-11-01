package com.is442.backend.model;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import java.util.UUID;


@Entity
@Table(name = "clinic_staff")
@PrimaryKeyJoinColumn(name = "supabase_user_id")
public class ClinicStaff extends User {

    @Column(name = "clinic_name")
    private String clinicName;

    @Column(name = "position")
    private String position; 

    public ClinicStaff() {
        super();
    }

    public ClinicStaff(UUID supabaseUserId, String email, String firstName, String lastName, String role,
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
