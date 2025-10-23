package com.is442.backend.repository;

import com.is442.backend.model.QueueTicket;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QueueTicketRepository extends JpaRepository<QueueTicket, Long> {
    Optional<QueueTicket> findByClinicIdAndAppointmentId(String clinicId, UUID appointmentId);
    List<QueueTicket> findByClinicIdAndStatusOrderByPositionAsc(String clinicId, String status);
    Optional<QueueTicket> findFirstByClinicIdAndStatusOrderByPositionAsc(String clinicId, String status);
    Optional<QueueTicket> findFirstByClinicIdOrderByPositionDesc(String clinicId);
}
