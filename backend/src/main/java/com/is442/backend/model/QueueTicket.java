package com.is442.backend.model;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "queue_ticket",
        uniqueConstraints = @UniqueConstraint(name="uq_ticket_clinic_appt", columnNames = {"clinic_id","appointment_id"})
)
public class QueueTicket {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="clinic_id", nullable=false)
    private String clinicId;

    @Column(name="appointment_id", nullable=false, columnDefinition = "uuid")
    private UUID appointmentId;

    @Column(name="patient_id", columnDefinition = "uuid")
    private UUID patientId;

    @Column(nullable=false)
    private Integer position;

    @Column(nullable=false)
    private String status = "WAITING"; // WAITING | SKIPPED | SERVED

    @Column(name="created_at", nullable=false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public QueueTicket() {}
    public QueueTicket(String clinicId, UUID appointmentId, UUID patientId, Integer position) {
        this.clinicId = clinicId; this.appointmentId = appointmentId; this.patientId = patientId; this.position = position;
    }

    public Long getId() { return id; }
    public String getClinicId() { return clinicId; }
    public UUID getAppointmentId() { return appointmentId; }
    public UUID getPatientId() { return patientId; }
    public Integer getPosition() { return position; }
    public String getStatus() { return status; }

    public void setStatus(String status) { this.status = status; }
}
