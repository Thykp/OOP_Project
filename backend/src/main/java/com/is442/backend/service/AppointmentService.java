package com.is442.backend.service;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.is442.backend.dto.AppointmentRequest;
import com.is442.backend.dto.AppointmentResponse;
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
                    if (docOpt.isPresent()) {
                        Doctor doc = docOpt.get();
                        doctorName = (doc.getDoctorName() != null) ? doc.getDoctorName() : "Unknown";
                        clinicName = (doc.getClinicName() != null) ? doc.getClinicName() : "Unknown";
                    } else {
                        doctorName = "Unknown";
                        clinicName = "Unknown";
                    }

                    return new AppointmentResponse(appointment, doctorName, clinicName);
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
        return updateAppointmentStatus(id, "CANCELLED");
    }

    public AppointmentResponse completeAppointment(UUID id) {
        return updateAppointmentStatus(id, "COMPLETED");
    }

    public AppointmentResponse markNoShow(UUID id) {
        return updateAppointmentStatus(id, "NO_SHOW");
    }

    public void deleteAppointment(UUID id) {
        if (!appointmentRepository.existsById(id)) {
            throw new RuntimeException("Appointment not found with id: " + id);
        }
        appointmentRepository.deleteById(id);
    }
}
