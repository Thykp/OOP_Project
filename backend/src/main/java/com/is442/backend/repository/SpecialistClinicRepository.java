package com.is442.backend.repository;

import com.is442.backend.model.SpecialistClinic;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SpecialistClinicRepository extends JpaRepository<SpecialistClinic, Integer> {
    Page<SpecialistClinic> findAll(Pageable pageable);

    Optional<SpecialistClinic> findByIhpClinicId(String ihpClinicId);
}
