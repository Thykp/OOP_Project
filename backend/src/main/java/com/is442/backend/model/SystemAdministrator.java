package com.is442.backend.model;

import jakarta.persistence.*;

@Entity
@Table(name = "system_admin")
public class SystemAdministrator extends User {

    @Column(name = "department")
    private String department;

    @Column(name = "admin_level")
    private String adminLevel; // e.g. "Super Admin", "Clinic Admin"

    public SystemAdministrator() {
        super();
    }

    public SystemAdministrator(String supabaseUserId, String email, String firstName, String lastName, String role,
                               String department, String adminLevel) {
        super(supabaseUserId, email, firstName, lastName, role);
        this.department = department;
        this.adminLevel = adminLevel;
    }

    // ===== Getters and Setters =====
    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getAdminLevel() {
        return adminLevel;
    }

    public void setAdminLevel(String adminLevel) {
        this.adminLevel = adminLevel;
    }
}
