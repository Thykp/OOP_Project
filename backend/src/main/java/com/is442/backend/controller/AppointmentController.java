package com.is442.backend.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.is442.backend.dto.AppointmentRequest;
import com.is442.backend.dto.AppointmentResponse;
import com.is442.backend.service.AppointmentService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/appointments")
@CrossOrigin(origins = "*")
public class AppointmentController {

    private final AppointmentService appointmentService;

    public AppointmentController(AppointmentService appointmentService) {
        this.appointmentService = appointmentService;
    }

    @PostMapping
    public ResponseEntity<AppointmentResponse> createAppointment(@Valid @RequestBody AppointmentRequest request) {
        try {
            AppointmentResponse response = appointmentService.createAppointment(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
    }

    @GetMapping
    public ResponseEntity<List<AppointmentResponse>> getAllAppointments() {
        List<AppointmentResponse> appointments = appointmentService.getAllAppointments();
        return ResponseEntity.ok(appointments);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppointmentResponse> getAppointmentById(@PathVariable UUID id) {
        try {
            AppointmentResponse response = appointmentService.getAppointmentById(id);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<AppointmentResponse>> getAppointmentsByPatient(@PathVariable String patientId) {
        List<AppointmentResponse> appointments = appointmentService.getAppointmentsByPatient(patientId);
        return ResponseEntity.ok(appointments);
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<AppointmentResponse>> getAppointmentsByDoctor(@PathVariable String doctorId) {
        List<AppointmentResponse> appointments = appointmentService.getAppointmentsByDoctor(doctorId);
        return ResponseEntity.ok(appointments);
    }

    @GetMapping("/clinic/{clinicId}")
    public ResponseEntity<List<AppointmentResponse>> getAppointmentsByClinic(@PathVariable String clinicId) {
        List<AppointmentResponse> appointments = appointmentService.getAppointmentsByClinic(clinicId);
        return ResponseEntity.ok(appointments);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<AppointmentResponse>> getAppointmentsByStatus(@PathVariable String status) {
        List<AppointmentResponse> appointments = appointmentService.getAppointmentsByStatus(status);
        return ResponseEntity.ok(appointments);
    }

    @GetMapping("/patient/{patientId}/upcoming")
    public ResponseEntity<List<AppointmentResponse>> getUpcomingAppointments(@PathVariable String patientId) {
        List<AppointmentResponse> appointments = appointmentService.getUpcomingAppointments(patientId);
        return ResponseEntity.ok(appointments);
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<AppointmentResponse> cancelAppointment(@PathVariable UUID id) {
        try {
            AppointmentResponse response = appointmentService.cancelAppointment(id);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/{id}/complete")
    public ResponseEntity<AppointmentResponse> completeAppointment(@PathVariable UUID id) {
        try {
            AppointmentResponse response = appointmentService.completeAppointment(id);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PatchMapping("/{id}/no-show")
    public ResponseEntity<AppointmentResponse> markNoShow(@PathVariable UUID id) {
        try {
            AppointmentResponse response = appointmentService.markNoShow(id);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAppointment(@PathVariable UUID id) {
        try {
            appointmentService.deleteAppointment(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
