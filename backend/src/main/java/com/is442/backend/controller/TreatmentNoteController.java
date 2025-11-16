package com.is442.backend.controller;

import com.is442.backend.dto.TreatmentNoteRequest;
import com.is442.backend.dto.TreatmentNoteResponse;
import com.is442.backend.service.TreatmentNoteService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/treatment-notes")
public class TreatmentNoteController {

    @Autowired
    private TreatmentNoteService treatmentNoteService;

    /**
     * Create a treatment note for a completed appointment
     * POST /api/treatment-notes
     */
    @PostMapping
    public ResponseEntity<?> createTreatmentNote(
            @RequestBody TreatmentNoteRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        try {
            if (userId == null || userId.isBlank()) {
                return ResponseEntity.badRequest().body("User ID is required in X-User-Id header");
            }

            TreatmentNoteResponse created = treatmentNoteService.createTreatmentNote(request, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error creating treatment note: " + e.getMessage());
        }
    }

    /**
     * Get all treatment notes for an appointment
     * GET /api/treatment-notes/appointment/{appointmentId}
     */
    @GetMapping("/appointment/{appointmentId}")
    public ResponseEntity<List<TreatmentNoteResponse>> getTreatmentNotesByAppointment(
            @PathVariable String appointmentId) {
        try {
            UUID appointmentUuid = UUID.fromString(appointmentId);
            List<TreatmentNoteResponse> notes = treatmentNoteService.getTreatmentNotesByAppointment(appointmentUuid);
            return ResponseEntity.ok(notes);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get all treatment notes for a patient
     * GET /api/treatment-notes/patient/{patientId}
     */
    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<TreatmentNoteResponse>> getTreatmentNotesByPatient(
            @PathVariable String patientId) {
        try {
            UUID patientUuid = UUID.fromString(patientId);
            List<TreatmentNoteResponse> notes = treatmentNoteService.getTreatmentNotesByPatient(patientUuid);
            return ResponseEntity.ok(notes);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get latest treatment note for an appointment
     * GET /api/treatment-notes/appointment/{appointmentId}/latest
     */
    @GetMapping("/appointment/{appointmentId}/latest")
    public ResponseEntity<TreatmentNoteResponse> getLatestTreatmentNote(
            @PathVariable String appointmentId) {
        try {
            UUID appointmentUuid = UUID.fromString(appointmentId);
            TreatmentNoteResponse note = treatmentNoteService.getLatestTreatmentNote(appointmentUuid);
            if (note == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(note);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update a treatment note
     * PUT /api/treatment-notes/{noteId}
     */
    @PutMapping("/{noteId}")
    public ResponseEntity<?> updateTreatmentNote(
            @PathVariable Long noteId,
            @RequestBody TreatmentNoteRequest request) {
        try {
            TreatmentNoteResponse updated = treatmentNoteService.updateTreatmentNote(noteId, request);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error updating treatment note: " + e.getMessage());
        }
    }

    /**
     * Delete a treatment note
     * DELETE /api/treatment-notes/{noteId}
     */
    @DeleteMapping("/{noteId}")
    public ResponseEntity<?> deleteTreatmentNote(@PathVariable Long noteId) {
        try {
            treatmentNoteService.deleteTreatmentNote(noteId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error deleting treatment note: " + e.getMessage());
        }
    }
}

