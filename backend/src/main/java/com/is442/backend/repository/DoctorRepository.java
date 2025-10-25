package com.is442.backend.repository;

import com.is442.backend.model.Doctor;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, String> {

    Optional<Doctor> findByDoctorId(String doctorId);

}