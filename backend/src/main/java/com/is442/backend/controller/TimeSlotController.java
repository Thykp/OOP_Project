package com.is442.backend.controller;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.is442.backend.dto.AvailableDateSlotsDto;
import com.is442.backend.dto.TimeSlotDto;
import com.is442.backend.dto.TimeSlotRequest;
import com.is442.backend.service.TimeSlotService;


@RestController
@RequestMapping("/api/timeslots")
@CrossOrigin(origins = "*")
public class TimeSlotController {
    private final TimeSlotService timeSlotService;

    public TimeSlotController(TimeSlotService timeSlotService) {
        this.timeSlotService = timeSlotService;
    }

    @GetMapping("/available/dateslots")
    public ResponseEntity<List<AvailableDateSlotsDto>> getAvailableDatesWithSlots(
            @RequestParam(required = false) String speciality,
            @RequestParam(required = false) String clinicId,
            @RequestParam(required = false) List<String> doctorId) {

        List<AvailableDateSlotsDto> available = timeSlotService.getAvailableDatesWithSlots(speciality, clinicId, doctorId);
        return ResponseEntity.ok(available);
    }

    // Admin endpoints

    /**
     * Get all time slots (admin only)
     */
    @GetMapping("/admin/all")
    public ResponseEntity<List<TimeSlotDto>> getAllTimeSlots() {
        try {
            List<TimeSlotDto> slots = timeSlotService.getAllTimeSlotsForAdmin();
            return ResponseEntity.ok(slots);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get time slots by doctor ID (admin only)
     */
    @GetMapping("/admin/doctor/{doctorId}")
    public ResponseEntity<List<TimeSlotDto>> getTimeSlotsByDoctor(@PathVariable String doctorId) {
        try {
            List<TimeSlotDto> slots = timeSlotService.getTimeSlotsByDoctor(doctorId);
            return ResponseEntity.ok(slots);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create a single time slot (admin only)
     */
    @PostMapping("/admin")
    public ResponseEntity<?> createTimeSlot(@RequestBody TimeSlotRequest request) {
        try {
            TimeSlotDto created = timeSlotService.createTimeSlot(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error creating time slot: " + e.getMessage());
        }
    }

    /**
     * Create multiple time slots with intervals (admin only)
     * Query param: slotIntervalMinutes (default: 15)
     */
    @PostMapping("/admin/bulk")
    public ResponseEntity<?> createTimeSlots(
            @RequestBody TimeSlotRequest request,
            @RequestParam(defaultValue = "15") int slotIntervalMinutes) {
        try {
            List<TimeSlotDto> created = timeSlotService.createTimeSlots(request, slotIntervalMinutes);
            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error creating time slots: " + e.getMessage());
        }
    }

    /**
     * Update a time slot (admin only)
     */
    @PutMapping("/admin/{id}")
    public ResponseEntity<?> updateTimeSlot(@PathVariable Long id, @RequestBody TimeSlotRequest request) {
        try {
            TimeSlotDto updated = timeSlotService.updateTimeSlot(id, request);
            return ResponseEntity.ok(updated);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error updating time slot: " + e.getMessage());
        }
    }

    /**
     * Delete a time slot (admin only)
     */
    @DeleteMapping("/admin/{id}")
    public ResponseEntity<?> deleteTimeSlot(@PathVariable Long id) {
        try {
            timeSlotService.deleteTimeSlot(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error deleting time slot: " + e.getMessage());
        }
    }

    /**
     * Delete all time slots for a doctor (admin only)
     */
    @DeleteMapping("/admin/doctor/{doctorId}")
    public ResponseEntity<?> deleteTimeSlotsByDoctor(@PathVariable String doctorId) {
        try {
            timeSlotService.deleteTimeSlotsByDoctor(doctorId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error deleting time slots: " + e.getMessage());
        }
    }
}
