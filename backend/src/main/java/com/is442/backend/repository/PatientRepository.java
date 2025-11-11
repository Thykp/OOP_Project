package com.is442.backend.repository;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.is442.backend.model.Patient;

@Repository
public interface PatientRepository extends JpaRepository<Patient,UUID> {
    Optional<Patient> findByEmail(String email);
    Optional<Patient> findBysupabaseUserId(UUID supabaseUserId);
    java.util.List<Patient> findByEmailContainingIgnoreCase(String emailPart);
}
