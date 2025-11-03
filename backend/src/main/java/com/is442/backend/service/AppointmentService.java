package com.is442.backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
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

@Service
@Transactional
public class AppointmentService {
    private final AppointmentRepository appointmentRepository;

    @Autowired // needed so springboot know to inject this
    private DoctorRepository doctorRepository;

    @Autowired
    private PatientRepository patientRepository;

    public AppointmentService(AppointmentRepository appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
    }

    /**
     * Checks if an appointment is at least 24 hours away from now
     * @param appointment The appointment to check
     * @throws RuntimeException if the appointment is less than 24 hours away
     */
    private void validateAdvanceNotice(Appointment appointment) {
        LocalDateTime appointmentDateTime = LocalDateTime.of(
            appointment.getBookingDate(), 
            appointment.getStartTime()
        );
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

        Appointment saved = appointmentRepository.save(appointment);
        return new AppointmentResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getAllAppointments() {
        return appointmentRepository.findAll().stream()
                .map(AppointmentResponse::new)
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
                .map(AppointmentResponse::new)
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
                .map(AppointmentResponse::new)
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
                    System.out.println("Looking up doctor for appointment " + appointment.getDoctorId());

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
                        
                        System.out.println("Doctor name: " + doctorName);
                    } else {
                        doctorName = "Unknown";
                        clinicName = "Unknown";
                        clinicType = "Unknown";
                        System.out.println("Doctor not found for id: " + appointment.getDoctorId());
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
                    System.out.println("Looking up doctor for appointment " + appointment.getDoctorId());

                    Optional<Doctor> docOpt = doctorRepository.findByDoctorId(appointment.getDoctorId());
                    String doctorName;
                    String clinicName;
                    if (docOpt.isPresent()) {
                        Doctor doc = docOpt.get();
                        doctorName = (doc.getDoctorName() != null) ? doc.getDoctorName() : "Unknown";
                        clinicName = (doc.getClinicName() != null) ? doc.getClinicName() : "Unknown";
                    } else {
                        doctorName = "Unknown";
                        clinicName = "Unknown";
                    }
                    Optional<Patient> patientOpt = patientRepository.findBysupabaseUserId(UUID.fromString(appointment.getPatientId()));
                    String patientName;
                    if (patientOpt.isPresent()) {
                        Patient patient = patientOpt.get();
                        patientName = (patient.getFirstName() + " " + patient.getLastName());
                    }else{
                        patientName = "Unknown";
                    }
                    return new AppointmentResponse(appointment, doctorName, clinicName, patientName);
                })
                .collect(Collectors.toList());
    }

    public AppointmentResponse updateAppointmentStatus(UUID id, String status) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found with id: " + id));

        appointment.setStatus(status);
        Appointment updated = appointmentRepository.save(appointment);
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
        
        return new AppointmentResponse(updated, doctorName, clinicName, clinicType);
    }

    public AppointmentResponse updateStatus(UUID id, String status){
        return updateAppointmentStatus(id, status);
    }
  
          
    public void deleteAppointment(UUID id) {
        Appointment appointment = appointmentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Appointment not found with id: " + id));
        
        // Validate 24-hour advance notice
        validateAdvanceNotice(appointment);
        
        appointmentRepository.deleteById(id);
    }
}
