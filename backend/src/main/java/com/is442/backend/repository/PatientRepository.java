package com.is442.backend.repository;
import com.is442.backend.model.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PatientRepository extends JpaRepository<Patient,UUID> {
    Optional<Patient> findByEmail(String email);
    Optional<Patient> findBysupabaseUserId(UUID supabaseUserId);
}
