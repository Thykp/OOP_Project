package com.is442.backend.repository;

import com.is442.backend.model.StaffReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface StaffReportRepository extends JpaRepository<StaffReport, Long> {

    Optional<StaffReport> findByClinicIdAndReportDate(String clinicId, LocalDate reportDate);

    List<StaffReport> findByClinicIdOrderByReportDateDesc(String clinicId);
}

