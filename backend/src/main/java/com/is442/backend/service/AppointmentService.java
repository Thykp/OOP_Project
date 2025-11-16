package com.is442.backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.is442.backend.dto.AppointmentRequest;
import com.is442.backend.dto.AppointmentResponse;
import com.is442.backend.dto.RescheduleRequest;
import com.is442.backend.model.Appointment;
import com.is442.backend.model.Doctor;
import com.is442.backend.model.Patient;
import com.is442.backend.repository.AppointmentRepository;
import com.is442.backend.repository.DoctorRepository;
import com.is442.backend.repository.PatientRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;

@Service
@Transactional
public class AppointmentService {
    private static final Logger logger = LoggerFactory.getLogger(AppointmentService.class);

    private final AppointmentRepository appointmentRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired // needed so springboot know to inject this
    private DoctorRepository doctorRepository;

    @Autowired
    private PatientRepository patientRepository;

    public AppointmentService(AppointmentRepository appointmentRepository, SimpMessagingTemplate messagingTemplate) {
        this.appointmentRepository = appointmentRepository;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Checks if an appointment is at least 24 hours away from now
     *
     * @param appointment The appointment to check
     * @throws RuntimeException if the appointment is less than 24 hours away
     */
    private void validateAdvanceNotice(Appointment appointment) {
        LocalDateTime appointmentDateTime = LocalDateTime.of(appointment.getBookingDate(), appointment.getStartTime());
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime minimumTime = now.plusHours(24);

        if (appointmentDateTime.isBefore(minimumTime)) {
            throw new RuntimeException("Appointments must be cancelled or rescheduled at least 24 hours in advance");
        }
    }

    public AppointmentResponse createAppointment(AppointmentRequest request) {
        List<Appointment> conflicts = appointmentRepository.findConflictingAppointments(
                request.getDoctorId(),
                request.getBookingDate(),
                request.getStartTime(),
                request.getEndTime());

        if (!conflicts.isEmpty()) {
            throw new RuntimeException("Doctor already has an appointment during this time slot");
        }

        Appointment appointment = new Appointment(
                request.getPatientId(),
                request.getDoctorId(),
                request.getClinicId(),
                request.getBookingDate(),
                request.getStartTime(),
                request.getEndTime());

        // Allow caller to override default type (e.g., WALK_IN)
        if (request.getType() != null && !request.getType().isBlank()) {
            appointment.setType(request.getType());
        }

        logger.info("Saving appointment entity: patient={}, doctor={}, clinic={}, date={}, start={}, end=",
                appointment.getPatientId(), appointment.getDoctorId(), appointment.getClinicId(),
                appointment.getBookingDate(), appointment.getStartTime(), appointment.getEndTime());

        Appointment saved = appointmentRepository.save(appointment);
        logger.info("Saved appointment id={}, clinicId={}", saved.getAppointmentId(), saved.getClinicId());

        // publish slot removal so other clients can update their UI in real-time
        try {
            com.is442.backend.dto.SlotUpdateDto update = new com.is442.backend.dto.SlotUpdateDto(
                    saved.getClinicId(), saved.getDoctorId(),
                    saved.getBookingDate().toString(),
                    saved.getStartTime().toString(),
                    saved.getEndTime().toString(),
                    "REMOVE");
            // broadcast on /topic/slots — clients may filter by clinicId/doctorId
            messagingTemplate.convertAndSend("/topic/slots", update);
        } catch (Exception e) {
            logger.warn("Failed to publish slot update message: {}", e.getMessage());
        }

        // --- NEW: publish appointment creation so staff dashboards receive it
        // immediately ---
        try {
            messagingTemplate.convertAndSend("/topic/appointments/status", java.util.Map.of(
                    "appointmentId", saved.getAppointmentId().toString(),
                    "status", saved.getStatus(),
                    "clinicId", saved.getClinicId(),
                    "patientId", saved.getPatientId(),
                    "doctorId", saved.getDoctorId()));
        } catch (Exception e) {
            logger.warn("Failed to publish appointment creation event: {}", e.getMessage());
        }

        return new AppointmentResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAllAppointments() {
        return appointmentRepository.findAll().stream()
                .map(appointment -> {
                    Optional<Doctor> docOpt = doctorRepository.findByDoctorId(appointment.getDoctorId());
                    String doctorName;
                    String clinicName;
                    String clinicType;
                    if (docOpt.isPresent()) {
                        Doctor doc = docOpt.get();
                        doctorName = (doc.getDoctorName() != null) ? doc.getDoctorName() : "Unknown";
                        clinicName = (doc.getClinicName() != null) ? doc.getClinicName() : "Unknown";
                        // Determine clinic type based on doctor's speciality
                        String speciality = doc.getSpeciality();
                        if (speciality != null && speciality.toUpperCase().contains("GENERAL PRACTICE")) {
                            clinicType = "General Practice";
                        } else {
                            clinicType = "Specialist Clinic";
                        }
                    } else {
                        doctorName = "Unknown";
                        clinicName = "Unknown";
                        clinicType = "Unknown";
                    }
                    Optional<Patient> patientOpt = patientRepository
                            .findBysupabaseUserId(UUID.fromString(appointment.getPatientId()));
                    String patientName;
                    if (patientOpt.isPresent()) {
                        Patient patient = patientOpt.get();
                        patientName = (patient.getFirstName() + " " + patient.getLastName());
                    } else {
                        patientName = "Unknown";
                    }
                    return new AppointmentResponse(appointment, doctorName, clinicName, patientName, clinicType);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AppointmentResponse getAppointmentById(UUID id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found with id: " + id));
        return new AppointmentResponse(appointment);
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAppointmentsByPatient(String patientId) {
        return appointmentRepository.findByPatientId(patientId).stream()
                .map(appointment -> {
                    Optional<Doctor> docOpt = doctorRepository.findByDoctorId(appointment.getDoctorId());
                    String doctorName;
                    String clinicName;
                    String clinicType;
                    if (docOpt.isPresent()) {
                        Doctor doc = docOpt.get();
                        doctorName = (doc.getDoctorName() != null) ? doc.getDoctorName() : "Unknown";
                        clinicName = (doc.getClinicName() != null) ? doc.getClinicName() : "Unknown";
                        // Determine clinic type based on doctor's speciality
                        String speciality = doc.getSpeciality();
                        if (speciality != null && speciality.toUpperCase().contains("GENERAL PRACTICE")) {
                            clinicType = "General Practice";
                        } else {
                            clinicType = "Specialist Clinic";
                        }
                    } else {
                        doctorName = "Unknown";
                        clinicName = "Unknown";
                        clinicType = "Unknown";
                    }
                    Optional<Patient> patientOpt = patientRepository
                            .findBysupabaseUserId(UUID.fromString(appointment.getPatientId()));
                    String patientName;
                    if (patientOpt.isPresent()) {
                        Patient patient = patientOpt.get();
                        patientName = (patient.getFirstName() + " " + patient.getLastName());
                    } else {
                        patientName = "Unknown";
                    }
                    return new AppointmentResponse(appointment, doctorName, clinicName, patientName, clinicType);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAppointmentsByDoctor(String doctorId) {
        return appointmentRepository.findByDoctorId(doctorId).stream()
                .map(AppointmentResponse::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAppointmentsByClinic(String clinicId) {
        return appointmentRepository.findByClinicId(clinicId).stream()
                .map(appointment -> {
                    // ---- doctor / clinic info ----
                    Optional<Doctor> docOpt = doctorRepository.findByDoctorId(appointment.getDoctorId());
                    String doctorName;
                    String clinicName;
                    String clinicType;

                    if (docOpt.isPresent()) {
                        Doctor doc = docOpt.get();
                        doctorName = (doc.getDoctorName() != null) ? doc.getDoctorName() : "Unknown";
                        clinicName = (doc.getClinicName() != null) ? doc.getClinicName() : "Unknown";

                        String speciality = doc.getSpeciality();
                        if (speciality != null && speciality.toUpperCase().contains("GENERAL PRACTICE")) {
                            clinicType = "General Practice";
                        } else {
                            clinicType = "Specialist Clinic";
                        }
                    } else {
                        doctorName = "Unknown";
                        clinicName = "Unknown";
                        clinicType = "Unknown";
                    }

                    // ---- patient info ----
                    Optional<Patient> patientOpt = patientRepository
                            .findBysupabaseUserId(UUID.fromString(appointment.getPatientId()));

                    String patientName;
                    if (patientOpt.isPresent()) {
                        Patient patient = patientOpt.get();
                        patientName = patient.getFirstName() + " " + patient.getLastName();
                    } else {
                        patientName = "Unknown";
                    }

                    // Use the enriched constructor, same as in getAllAppointments()
                    return new AppointmentResponse(
                            appointment,
                            doctorName,
                            clinicName,
                            patientName,
                            clinicType);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAppointmentsByStatus(String status) {
        return appointmentRepository.findByStatus(status).stream()
                .map(AppointmentResponse::new)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getUpcomingAppointments(String patientId) {
        LocalDate today = LocalDate.now();
        return appointmentRepository.findUpcomingAppointmentsByPatient(patientId, today).stream()
                .map(appointment -> {
                    Optional<Doctor> docOpt = doctorRepository.findByDoctorId(appointment.getDoctorId());
                    String doctorName;
                    String clinicName;
                    String clinicType;
                    if (docOpt.isPresent()) {
                        Doctor doc = docOpt.get();
                        doctorName = (doc.getDoctorName() != null) ? doc.getDoctorName() : "Unknown";
                        clinicName = (doc.getClinicName() != null) ? doc.getClinicName() : "Unknown";
                        // Determine clinic type based on doctor's speciality
                        String speciality = doc.getSpeciality();
                        if (speciality != null && speciality.toUpperCase().contains("GENERAL PRACTICE")) {
                            clinicType = "General Practice";
                        } else {
                            clinicType = "Specialist Clinic";
                        }
                    } else {
                        doctorName = "Unknown";
                        clinicName = "Unknown";
                        clinicType = "Unknown";
                    }

                    return new AppointmentResponse(appointment, doctorName, clinicName, clinicType);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getUpcomingAppointments() {
        LocalDate today = LocalDate.now();
        return appointmentRepository.findUpcomingAppointments(today).stream()
                .map(appointment -> {
                    Optional<Doctor> docOpt = doctorRepository.findByDoctorId(appointment.getDoctorId());
                    String doctorName;
                    String clinicName;
                    String clinicType;
                    if (docOpt.isPresent()) {
                        Doctor doc = docOpt.get();
                        doctorName = (doc.getDoctorName() != null) ? doc.getDoctorName() : "Unknown";
                        clinicName = (doc.getClinicName() != null) ? doc.getClinicName() : "Unknown";
                        // Determine clinic type based on doctor's speciality
                        String speciality = doc.getSpeciality();
                        if (speciality != null && speciality.toUpperCase().contains("GENERAL PRACTICE")) {
                            clinicType = "General Practice";
                        } else {
                            clinicType = "Specialist Clinic";
                        }
                    } else {
                        doctorName = "Unknown";
                        clinicName = "Unknown";
                        clinicType = "Unknown";
                    }
                    Optional<Patient> patientOpt = patientRepository
                            .findBysupabaseUserId(UUID.fromString(appointment.getPatientId()));
                    String patientName;
                    if (patientOpt.isPresent()) {
                        Patient patient = patientOpt.get();
                        patientName = (patient.getFirstName() + " " + patient.getLastName());
                    } else {
                        patientName = "Unknown";
                    }
                    return new AppointmentResponse(appointment, doctorName, clinicName, patientName, clinicType);
                })
                .collect(Collectors.toList());
    }

    public AppointmentResponse updateAppointmentStatus(UUID id, String status) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found with id: " + id));

        appointment.setStatus(status);
        Appointment updated = appointmentRepository.save(appointment);
        // Broadcast status change so staff dashboards can update in real-time
        try {
            messagingTemplate.convertAndSend("/topic/appointments/status", java.util.Map.of(
                    "appointmentId", updated.getAppointmentId().toString(),
                    "status", updated.getStatus(),
                    "clinicId", updated.getClinicId(),
                    "patientId", updated.getPatientId(),
                    "doctorId", updated.getDoctorId()));
        } catch (Exception e) {
            logger.warn("Failed to publish appointment status update: {}", e.getMessage());
        }
        return new AppointmentResponse(updated);
    }

    public AppointmentResponse cancelAppointment(UUID id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found with id: " + id));

        // Validate 24-hour advance notice
        validateAdvanceNotice(appointment);

        return updateAppointmentStatus(id, "CANCELLED");
    }

    public AppointmentResponse completeAppointment(UUID id) {
        return updateAppointmentStatus(id, "COMPLETED");
    }

    public AppointmentResponse markNoShow(UUID id) {
        return updateAppointmentStatus(id, "NO_SHOW");
    }

    public AppointmentResponse markInConsultation(UUID id) {
        return updateAppointmentStatus(id, "IN_CONSULTATION");
    }

    public AppointmentResponse rescheduleAppointment(UUID id, RescheduleRequest request) {
        // Find the existing appointment
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found with id: " + id));

        // Validate 24-hour advance notice
        validateAdvanceNotice(appointment);

        // Check for conflicts with the new time slot
        List<Appointment> conflicts = appointmentRepository.findConflictingAppointments(
                request.getDoctorId(),
                request.getBookingDate(),
                request.getStartTime(),
                request.getEndTime());

        // Filter out the current appointment from conflicts
        conflicts = conflicts.stream()
                .filter(conflict -> !conflict.getAppointmentId().equals(id))
                .collect(Collectors.toList());

        if (!conflicts.isEmpty()) {
            throw new RuntimeException("Doctor already has an appointment during this time slot");
        }

        // Update appointment details
        appointment.setDoctorId(request.getDoctorId());
        appointment.setClinicId(request.getClinicId());
        appointment.setBookingDate(request.getBookingDate());
        appointment.setStartTime(request.getStartTime());
        appointment.setEndTime(request.getEndTime());
        // Keep status as SCHEDULED so it appears in upcoming appointments

        // Save the updated appointment
        Appointment updated = appointmentRepository.save(appointment);

        // Get doctor details for response
        Optional<Doctor> docOpt = doctorRepository.findByDoctorId(updated.getDoctorId());
        String doctorName = "Unknown";
        String clinicName = "Unknown";
        String clinicType = "Unknown";

        if (docOpt.isPresent()) {
            Doctor doc = docOpt.get();
            doctorName = (doc.getDoctorName() != null) ? doc.getDoctorName() : "Unknown";
            clinicName = (doc.getClinicName() != null) ? doc.getClinicName() : "Unknown";

            String speciality = doc.getSpeciality();
            if (speciality != null && speciality.toUpperCase().contains("GENERAL PRACTICE")) {
                clinicType = "General Practice";
            } else {
                clinicType = "Specialist Clinic";
            }
        }
        // Publish reschedule event (staff) so patient dashboard / other staff update
        try {
            messagingTemplate.convertAndSend("/topic/appointments/status", java.util.Map.ofEntries(
                    java.util.Map.entry("appointmentId", updated.getAppointmentId().toString()),
                    java.util.Map.entry("status", "RESCHEDULED"),
                    java.util.Map.entry("clinicId", updated.getClinicId()),
                    java.util.Map.entry("patientId", updated.getPatientId()),
                    java.util.Map.entry("doctorId", updated.getDoctorId()),
                    java.util.Map.entry("doctorName", doctorName),
                    java.util.Map.entry("clinicName", clinicName),
                    java.util.Map.entry("bookingDate", updated.getBookingDate().toString()),
                    java.util.Map.entry("startTime", updated.getStartTime().toString()),
                    java.util.Map.entry("endTime", updated.getEndTime().toString()),
                    java.util.Map.entry("type", updated.getType() != null ? updated.getType() : "UNKNOWN")));
        } catch (Exception e) {
            logger.warn("Failed to publish staff reschedule event: {}", e.getMessage());
        }

        return new AppointmentResponse(updated, doctorName, clinicName, clinicType);
    }

    public AppointmentResponse updateStatus(UUID id, String status) {
        return updateAppointmentStatus(id, status);
    }

    public void deleteAppointment(UUID id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found with id: " + id));

        // Validate 24-hour advance notice
        validateAdvanceNotice(appointment);
        try {
            messagingTemplate.convertAndSend("/topic/appointments/status", java.util.Map.of(
                    "appointmentId", appointment.getAppointmentId().toString(),
                    "status", "CANCELLED",
                    "clinicId", appointment.getClinicId(),
                    "patientId", appointment.getPatientId(),
                    "doctorId", appointment.getDoctorId()));
        } catch (Exception e) {
            logger.warn("Failed to publish appointment cancellation: {}", e.getMessage());
        }

        appointmentRepository.deleteById(id);
    }

    // For receptionist - can cancel anytime before the appt
    public void deleteAppt(UUID id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found with id: " + id));
        try {
            messagingTemplate.convertAndSend("/topic/appointments/status", java.util.Map.of(
                    "appointmentId", appointment.getAppointmentId().toString(),
                    "status", "CANCELLED",
                    "clinicId", appointment.getClinicId(),
                    "patientId", appointment.getPatientId(),
                    "doctorId", appointment.getDoctorId()));
        } catch (Exception e) {
            logger.warn("Failed to publish appointment cancellation (staff): {}", e.getMessage());
        }
        appointmentRepository.deleteById(id);
    }

    // For receptionist - can reschdule anytime before the appt
    public AppointmentResponse rescheduleAppt(UUID id, RescheduleRequest request) {
        // Find the existing appointment
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found with id: " + id));

        // Check for conflicts with the new time slot
        List<Appointment> conflicts = appointmentRepository.findConflictingAppointments(
                request.getDoctorId(),
                request.getBookingDate(),
                request.getStartTime(),
                request.getEndTime());

        // Filter out the current appointment from conflicts
        conflicts = conflicts.stream()
                .filter(conflict -> !conflict.getAppointmentId().equals(id))
                .collect(Collectors.toList());

        if (!conflicts.isEmpty()) {
            throw new RuntimeException("Doctor already has an appointment during this time slot");
        }

        // Update appointment details
        appointment.setDoctorId(request.getDoctorId());
        appointment.setClinicId(request.getClinicId());
        appointment.setBookingDate(request.getBookingDate());
        appointment.setStartTime(request.getStartTime());
        appointment.setEndTime(request.getEndTime());
        // Keep status as SCHEDULED so it appears in upcoming appointments

        // Save the updated appointment
        Appointment updated = appointmentRepository.save(appointment);

        // Get doctor details for response
        Optional<Doctor> docOpt = doctorRepository.findByDoctorId(updated.getDoctorId());
        String doctorName = "Unknown";
        String clinicName = "Unknown";
        String clinicType = "Unknown";

        if (docOpt.isPresent()) {
            Doctor doc = docOpt.get();
            doctorName = (doc.getDoctorName() != null) ? doc.getDoctorName() : "Unknown";
            clinicName = (doc.getClinicName() != null) ? doc.getClinicName() : "Unknown";

            String speciality = doc.getSpeciality();
            if (speciality != null && speciality.toUpperCase().contains("GENERAL PRACTICE")) {
                clinicType = "General Practice";
            } else {
                clinicType = "Specialist Clinic";
            }
        }

        // Publish reschedule event (staff) so patient dashboard / other staff update
        try {
            messagingTemplate.convertAndSend("/topic/appointments/status", java.util.Map.ofEntries(
                    java.util.Map.entry("appointmentId", updated.getAppointmentId().toString()),
                    java.util.Map.entry("status", "RESCHEDULED"),
                    java.util.Map.entry("clinicId", updated.getClinicId()),
                    java.util.Map.entry("patientId", updated.getPatientId()),
                    java.util.Map.entry("doctorId", updated.getDoctorId()),
                    java.util.Map.entry("doctorName", doctorName),
                    java.util.Map.entry("clinicName", clinicName),
                    java.util.Map.entry("bookingDate", updated.getBookingDate().toString()),
                    java.util.Map.entry("startTime", updated.getStartTime().toString()),
                    java.util.Map.entry("endTime", updated.getEndTime().toString()),
                    java.util.Map.entry("type", updated.getType() != null ? updated.getType() : "UNKNOWN")));
        } catch (Exception e) {
            logger.warn("Failed to publish staff reschedule event: {}", e.getMessage());
        }

        return new AppointmentResponse(updated, doctorName, clinicName, clinicType);
    }

    /**
     * Creates a walk-in appointment asynchronously in the background.
     * This method is called when a patient checks in without a pre-existing
     * appointment.
     *
     * @param appointmentId the UUID of the appointment (already generated)
     * @param patientId     the patient's UUID
     * @param clinicId      the clinic identifier
     * @param doctorId      the doctor ID to assign (can be "UNASSIGNED" if not
     *                      provided)
     */
    @Async("appointmentTaskExecutor")
    public void createWalkInAppointmentAsync(UUID appointmentId, String patientId, String clinicId, String doctorId) {
        try {
            logger.info("Creating walk-in appointment: appointmentId={}, patientId={}, clinicId={}, doctorId={}",
                    appointmentId, patientId, clinicId, doctorId);

            // Use provided doctorId or default to UNASSIGNED
            String doctorIdToUse = (doctorId != null && !doctorId.trim().isEmpty()) ? doctorId : "UNASSIGNED";
            createWalkInAppointmentWithDoctor(appointmentId, patientId, clinicId, doctorIdToUse);

        } catch (Exception e) {
            logger.error("Error creating walk-in appointment: appointmentId={}, patientId={}, clinicId={}, error={}",
                    appointmentId, patientId, clinicId, e.getMessage(), e);
            // Don't throw exception - this is async and we don't want to break the check-in
            // flow
        }
    }

    /**
     * Helper method to create the walk-in appointment with a specific doctor.
     * Uses native SQL INSERT to bypass Hibernate's entity management and handle
     * manually set UUIDs.
     */
    private void createWalkInAppointmentWithDoctor(UUID appointmentId, String patientId, String clinicId,
                                                   String doctorId) {
        // Check if appointment already exists (might have been created in another
        // transaction)
        if (appointmentRepository.findById(appointmentId).isPresent()) {
            logger.info("Walk-in appointment already exists: appointmentId={}, skipping creation", appointmentId);
            return;
        }

        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        // end_time can be null for walk-in appointments but has some issues, we put an
        // estimated end time first
        LocalTime endTime = LocalTime.now().plusHours(1);
        LocalDateTime createdAt = LocalDateTime.now();

        // Use native SQL INSERT to bypass Hibernate's entity management
        // This allows us to manually set the UUID without conflicts with
        // @GeneratedValue
        String sql = "INSERT INTO appointment (appointment_id, patient_id, doctor_id, clinic_id, " +
                "booking_date, start_time, end_time, status, type, created_at, updated_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

        Query query = entityManager.createNativeQuery(sql);
        query.setParameter(1, appointmentId);
        query.setParameter(2, patientId);
        query.setParameter(3, doctorId);
        query.setParameter(4, clinicId);
        query.setParameter(5, today);
        query.setParameter(6, now);
        query.setParameter(7, endTime);
        query.setParameter(8, "SCHEDULED");
        query.setParameter(9, "WALK_IN");
        query.setParameter(10, createdAt);
        query.setParameter(11, createdAt);

        try {
            query.executeUpdate();
            entityManager.flush();
            logger.info("Successfully created walk-in appointment: appointmentId={}, status=SCHEDULED",
                    appointmentId);

            String doctorName = "";
            String clinicName = "";
            try {
                if (doctorId != null && !"UNASSIGNED".equals(doctorId)) {
                    Optional<Doctor> docOpt = doctorRepository.findByDoctorId(doctorId);
                    if (docOpt.isPresent()) {
                        Doctor doc = docOpt.get();
                        doctorName = doc.getDoctorName() != null ? doc.getDoctorName() : "";
                        clinicName = doc.getClinicName() != null ? doc.getClinicName() : "";
                    }
                }
            } catch (Exception e) {
                logger.warn("Failed to resolve doctor/clinic names for walk-in publish: {}", e.getMessage());
            }
            // Broadcast new walk-in as SCHEDULED so dashboards update
            try {
                messagingTemplate.convertAndSend("/topic/appointments/status", java.util.Map.ofEntries(
                        java.util.Map.entry("appointmentId", appointmentId.toString()),
                        java.util.Map.entry("status", "SCHEDULED"),
                        java.util.Map.entry("clinicId", clinicId),
                        java.util.Map.entry("clinicName", clinicName),
                        java.util.Map.entry("patientId", patientId),
                        java.util.Map.entry("doctorId", doctorId),
                        java.util.Map.entry("doctorName", doctorName),
                        java.util.Map.entry("bookingDate", today.toString()),
                        java.util.Map.entry("startTime", now.toString()),
                        java.util.Map.entry("endTime", endTime.toString()),
                        java.util.Map.entry("createdAt", createdAt.toString()),
                        java.util.Map.entry("type", "WALK_IN")));
            } catch (Exception e2) {
                logger.warn("Failed to publish walk-in status: {}", e2.getMessage());
            }
        } catch (Exception e) {
            // Check if it's a duplicate key error (appointment was created in another
            // transaction)
            String errorMsg = e.getMessage();
            if (errorMsg != null && (errorMsg.contains("duplicate key") ||
                    errorMsg.contains("unique constraint") ||
                    errorMsg.contains("Duplicate entry"))) {
                logger.info("Walk-in appointment already exists (duplicate key): appointmentId={}, skipping",
                        appointmentId);
            } else {
                throw e; // Re-throw if it's a different error
            }
        }
    }

    /**
     * Updates the status of an existing appointment to "CHECKED-IN" asynchronously.
     * This is called when a patient with a booked appointment checks in.
     *
     * @param appointmentId the UUID of the appointment
     */
    @Async("appointmentTaskExecutor")
    public void updateAppointmentStatusToCheckedInAsync(UUID appointmentId) {
        try {
            logger.info("Updating appointment status to CHECKED-IN: appointmentId={}", appointmentId);

            Optional<Appointment> appointmentOpt = appointmentRepository.findById(appointmentId);
            if (appointmentOpt.isEmpty()) {
                logger.warn("Appointment not found for status update: appointmentId={}", appointmentId);
                return;
            }

            Appointment appointment = appointmentOpt.get();
            appointment.setStatus("CHECKED-IN");
            appointmentRepository.save(appointment);

            logger.info("Successfully updated appointment status to CHECKED-IN: appointmentId={}", appointmentId);
            // Broadcast checked-in status to listeners
            try {
                messagingTemplate.convertAndSend("/topic/appointments/status", java.util.Map.of(
                        "appointmentId", appointment.getAppointmentId().toString(),
                        "status", appointment.getStatus(),
                        "clinicId", appointment.getClinicId(),
                        "patientId", appointment.getPatientId(),
                        "doctorId", appointment.getDoctorId()));
            } catch (Exception e2) {
                logger.warn("Failed to publish checked-in update: {}", e2.getMessage());
            }
        } catch (Exception e) {
            logger.error("Error updating appointment status to CHECKED-IN: appointmentId={}, error={}",
                    appointmentId, e.getMessage(), e);
            // Don't throw exception - this is async and we don't want to break the check-in
            // flow
        }
    }

    /**
     * Updates the doctor_id field of an existing appointment.
     * Returns true if the update was successful, false if the appointment doesn't
     * exist.
     *
     * @param appointmentId the UUID of the appointment
     * @param doctorId      the doctor ID to assign
     * @return true if update was successful, false if appointment not found
     */
    @Transactional
    public boolean updateAppointmentDoctorId(UUID appointmentId, String doctorId) {
        try {
            Optional<Appointment> appointmentOpt = appointmentRepository.findById(appointmentId);
            if (appointmentOpt.isEmpty()) {
                logger.warn("Appointment not found for doctor_id update: appointmentId={}, doctorId={}. " +
                        "This may be a walk-in appointment that hasn't been created yet.", appointmentId, doctorId);
                return false;
            }

            Appointment appointment = appointmentOpt.get();
            appointment.setDoctorId(doctorId);
            appointmentRepository.save(appointment);

            logger.info("Updated appointment doctor_id: appointmentId={}, doctorId={}", appointmentId, doctorId);
            return true;
        } catch (Exception e) {
            logger.error("Error updating appointment doctor_id: appointmentId={}, doctorId={}, error={}",
                    appointmentId, doctorId, e.getMessage(), e);
            return false;
        }
    }
}
