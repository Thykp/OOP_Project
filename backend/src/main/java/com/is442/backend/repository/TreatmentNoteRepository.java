package com.is442.backend.repository;

import com.is442.backend.model.TreatmentNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TreatmentNoteRepository extends JpaRepository<TreatmentNote, Long> {

    List<TreatmentNote> findByAppointmentId(UUID appointmentId);

    // Query by patient through appointment join
    @Query("SELECT tn FROM TreatmentNote tn JOIN Appointment a ON tn.appointmentId = a.appointmentId WHERE a.patientId = :patientId")
    List<TreatmentNote> findByPatientId(@Param("patientId") String patientId);

    // Query by doctor through appointment join
    @Query("SELECT tn FROM TreatmentNote tn JOIN Appointment a ON tn.appointmentId = a.appointmentId WHERE a.doctorId = :doctorId")
    List<TreatmentNote> findByDoctorId(@Param("doctorId") String doctorId);

    Optional<TreatmentNote> findFirstByAppointmentIdOrderByCreatedAtDesc(UUID appointmentId);

    List<TreatmentNote> findByAppointmentIdOrderByCreatedAtDesc(UUID appointmentId);
}

