package com.is442.backend.repository;

import com.is442.backend.model.GpClinic;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GpClinicRepository extends JpaRepository<GpClinic, Integer> {
    Page<GpClinic> findAll(Pageable pageable);
}
