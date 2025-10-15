package com.is442.backend.repository;

import com.is442.backend.model.Appointment;

import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;


public interface AppointmentRepository extends JpaRepository<Appointment, UUID>{
    // Page<Appointment> findAll(Pageable pageable);
}
