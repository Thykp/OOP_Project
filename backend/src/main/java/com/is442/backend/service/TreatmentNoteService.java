package com.is442.backend.service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.is442.backend.dto.TreatmentNoteRequest;
import com.is442.backend.dto.TreatmentNoteResponse;
import com.is442.backend.model.Appointment;
import com.is442.backend.model.Doctor;
import com.is442.backend.model.TreatmentNote;
import com.is442.backend.model.User;
import com.is442.backend.repository.AppointmentRepository;
import com.is442.backend.repository.DoctorRepository;
import com.is442.backend.repository.TreatmentNoteRepository;
import com.is442.backend.repository.UserRepository;

@Service
public class TreatmentNoteService {
    
    @Autowired
    private TreatmentNoteRepository treatmentNoteRepository;
    
    @Autowired
    private AppointmentRepository appointmentRepository;
    
    @Autowired
    private DoctorRepository doctorRepository;
    
    @Autowired(required = false)
    private UserRepository userRepository;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;
    
    /**
     * Create a treatment note for a completed appointment
     */
    @Transactional
    public TreatmentNoteResponse createTreatmentNote(TreatmentNoteRequest request, String createdBy) {
        // Validate appointment exists and is completed
        UUID appointmentId = UUID.fromString(request.getAppointmentId());
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new RuntimeException("Appointment not found with ID: " + request.getAppointmentId()));
        
        // Validate appointment is completed
        if (!"COMPLETED".equals(appointment.getStatus())) {
            throw new RuntimeException("Treatment notes can only be added to completed appointments");
        }
        
        // Get doctor information
        Doctor doctor = doctorRepository.findByDoctorId(appointment.getDoctorId())
                .orElseThrow(() -> new RuntimeException("Doctor not found with ID: " + appointment.getDoctorId()));
        
        // Create treatment note (patient_id, doctor_id, clinic_id come from appointment)
        TreatmentNote note = new TreatmentNote(
                appointmentId,
                request.getNoteType() != null ? request.getNoteType() : "TREATMENT_SUMMARY",
                request.getNotes(),
                createdBy
        );
        
        TreatmentNote saved = treatmentNoteRepository.save(note);
        TreatmentNoteResponse response = toResponse(saved, appointment, doctor);
        // Broadcast new/updated treatment note (minimal payload for clients)
        if (messagingTemplate != null) {
            try {
                messagingTemplate.convertAndSend("/topic/appointments/treatment-notes", java.util.Map.of(
                        "appointmentId", response.getAppointmentId(),
                        "noteId", response.getId(),
                        "noteType", response.getNoteType(),
                        "notes", response.getNotes(),
                        "createdByName", response.getCreatedByName(),
                        "createdAt", response.getCreatedAt()
                ));
            } catch (Exception e) {
                // swallow to avoid impacting main flow
            }
        }
        return response;
    }
    
    /**
     * Get all treatment notes for an appointment
     */
    public List<TreatmentNoteResponse> getTreatmentNotesByAppointment(UUID appointmentId) {
        List<TreatmentNote> notes = treatmentNoteRepository.findByAppointmentIdOrderByCreatedAtDesc(appointmentId);
        return notes.stream()
                .map(note -> {
                    Appointment appointment = appointmentRepository.findById(note.getAppointmentId())
                            .orElse(null);
                    Doctor doctor = appointment != null 
                            ? doctorRepository.findByDoctorId(appointment.getDoctorId()).orElse(null)
                            : null;
                    return toResponse(note, appointment, doctor);
                })
                .collect(Collectors.toList());
    }
    
    /**
     * Get all treatment notes for a patient
     */
    public List<TreatmentNoteResponse> getTreatmentNotesByPatient(UUID patientId) {
        List<TreatmentNote> notes = treatmentNoteRepository.findByPatientId(patientId.toString());
        return notes.stream()
                .map(note -> {
                    Appointment appointment = appointmentRepository.findById(note.getAppointmentId())
                            .orElse(null);
                    Doctor doctor = appointment != null 
                            ? doctorRepository.findByDoctorId(appointment.getDoctorId()).orElse(null)
                            : null;
                    return toResponse(note, appointment, doctor);
                })
                .collect(Collectors.toList());
    }
    
    /**
     * Get latest treatment note for an appointment
     */
    public TreatmentNoteResponse getLatestTreatmentNote(UUID appointmentId) {
        return treatmentNoteRepository.findFirstByAppointmentIdOrderByCreatedAtDesc(appointmentId)
                .map(note -> {
                    Appointment appointment = appointmentRepository.findById(note.getAppointmentId())
                            .orElse(null);
                    Doctor doctor = appointment != null 
                            ? doctorRepository.findByDoctorId(appointment.getDoctorId()).orElse(null)
                            : null;
                    return toResponse(note, appointment, doctor);
                })
                .orElse(null);
    }
    
    /**
     * Update a treatment note
     */
    @Transactional
    public TreatmentNoteResponse updateTreatmentNote(Long noteId, TreatmentNoteRequest request) {
        TreatmentNote note = treatmentNoteRepository.findById(noteId)
                .orElseThrow(() -> new RuntimeException("Treatment note not found with ID: " + noteId));
        
        if (request.getNoteType() != null && !request.getNoteType().isBlank()) {
            note.setNoteType(request.getNoteType());
        }
        
        if (request.getNotes() != null && !request.getNotes().isBlank()) {
            note.setNotes(request.getNotes());
        }
        
    TreatmentNote updated = treatmentNoteRepository.save(note);
    Appointment appointment = appointmentRepository.findById(updated.getAppointmentId())
        .orElse(null);
    Doctor doctor = appointment != null 
        ? doctorRepository.findByDoctorId(appointment.getDoctorId()).orElse(null)
        : null;
    TreatmentNoteResponse response = toResponse(updated, appointment, doctor);
    if (messagingTemplate != null) {
        try {
        messagingTemplate.convertAndSend("/topic/appointments/treatment-notes", java.util.Map.of(
            "appointmentId", response.getAppointmentId(),
            "noteId", response.getId(),
            "noteType", response.getNoteType(),
            "notes", response.getNotes(),
            "createdByName", response.getCreatedByName(),
            "updatedAt", response.getUpdatedAt()
        ));
        } catch (Exception e) {
        // swallow
        }
    }
    return response;
    }
    
    /**
     * Delete a treatment note
     */
    @Transactional
    public void deleteTreatmentNote(Long noteId) {
        if (!treatmentNoteRepository.existsById(noteId)) {
            throw new RuntimeException("Treatment note not found with ID: " + noteId);
        }
        treatmentNoteRepository.deleteById(noteId);
    }
    
    /**
     * Convert TreatmentNote entity to TreatmentNoteResponse DTO
     * Gets patient_id, doctor_id, clinic_id from the appointment
     */
    private TreatmentNoteResponse toResponse(TreatmentNote note, Appointment appointment, Doctor doctor) {
        TreatmentNoteResponse response = new TreatmentNoteResponse();
        response.setId(note.getId());
        response.setAppointmentId(note.getAppointmentId());
        
        // Get patient_id, doctor_id, clinic_id from appointment
        if (appointment != null) {
            response.setPatientId(UUID.fromString(appointment.getPatientId()));
            response.setDoctorId(appointment.getDoctorId());
            response.setClinicId(appointment.getClinicId());
        }
        
        response.setDoctorName(doctor != null ? doctor.getDoctorName() : "Unknown Doctor");
        response.setClinicName(doctor != null ? doctor.getClinicName() : "Unknown Clinic");
        response.setNoteType(note.getNoteType());
        response.setNotes(note.getNotes());
        response.setCreatedBy(note.getCreatedBy());
        
        // Try to get creator name from user repository if available
        if (userRepository != null) {
            try {
                UUID creatorId = UUID.fromString(note.getCreatedBy());
                User creator = userRepository.findById(creatorId).orElse(null);
                if (creator != null) {
                    response.setCreatedByName(creator.getFirstName() + " " + creator.getLastName());
                }
            } catch (Exception e) {
                // If createdBy is not a UUID or user not found, leave as null
            }
        }
        
        response.setCreatedAt(note.getCreatedAt());
        response.setUpdatedAt(note.getUpdatedAt());
        
        return response;
    }
}

