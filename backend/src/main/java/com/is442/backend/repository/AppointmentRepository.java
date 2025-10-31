package com.is442.backend.repository;

import com.is442.backend.model.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {
    
    List<Appointment> findByPatientId(String patientId);
    
    List<Appointment> findByDoctorId(String doctorId);
    
    List<Appointment> findByClinicId(String clinicId);
    
    List<Appointment> findByStatus(String status);
    
    List<Appointment> findByBookingDate(LocalDate bookingDate);
    
    
    List<Appointment> findByPatientIdAndStatus(String patientId, String status);
    
    List<Appointment> findByDoctorIdAndBookingDate(String doctorId, LocalDate bookingDate);
    
    List<Appointment> findByDoctorIdInAndBookingDateBetween(
    List<String> doctorIds, LocalDate start, LocalDate end);

    
    @Query("SELECT a FROM Appointment a WHERE a.doctorId = :doctorId " +
           "AND a.bookingDate = :bookingDate " +
           "AND a.status = 'SCHEDULED' " +
           "AND ((a.startTime < :endTime AND a.endTime > :startTime))")
    List<Appointment> findConflictingAppointments(
        @Param("doctorId") String doctorId,
        @Param("bookingDate") LocalDate bookingDate,
        @Param("startTime") LocalTime startTime,
        @Param("endTime") LocalTime endTime
    );
    
    @Query("SELECT a FROM Appointment a WHERE a.patientId = :patientId " +
           "AND a.status = 'SCHEDULED' " +
           "AND a.bookingDate >= :today " +
           "ORDER BY a.bookingDate, a.startTime")
    List<Appointment> findUpcomingAppointmentsByPatient(
        @Param("patientId") String patientId,
        @Param("today") LocalDate today
    );
}
