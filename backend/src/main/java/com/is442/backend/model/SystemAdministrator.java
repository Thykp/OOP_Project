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

    public SystemAdministrator() {
        super();
        this.setRole("ROLE_ADMIN");
    }

    public SystemAdministrator(UUID supabaseUserId, String email, String firstName, String lastName, String role, String status) {
        super(supabaseUserId, email, firstName, lastName, role, status);
    }

}
