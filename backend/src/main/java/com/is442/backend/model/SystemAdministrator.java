package com.is442.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import java.util.UUID;


@Entity
@Table(name = "system_admin")
@PrimaryKeyJoinColumn(name = "supabase_user_id")
public class SystemAdministrator extends User {

    // @Column(name = "department")
    // private String department;

    // @Column(name = "admin_level")
    // private String adminLevel; // e.g. "Super Admin", "Clinic Admin"

    public SystemAdministrator() {
        super();
        this.setRole("ROLE_ADMIN");
    }

    // public SystemAdministrator(UUID supabaseUserId, String email, String firstName, String lastName, String role,
    //                            String department, String adminLevel) {
    //     super(supabaseUserId, email, firstName, lastName, role);
    //     this.department = department;
    //     this.adminLevel = adminLevel;
    // }

        public SystemAdministrator(UUID supabaseUserId, String email, String firstName, String lastName, String role, String status) {
        super(supabaseUserId, email, firstName, lastName, role, status);
    }

    // ===== Getters and Setters =====
    // public String getDepartment() {
    //     return department;
    // }

    // public void setDepartment(String department) {
    //     this.department = department;
    // }

    // public String getAdminLevel() {
    //     return adminLevel;
    // }

    // public void setAdminLevel(String adminLevel) {
    //     this.adminLevel = adminLevel;
    // }
}
