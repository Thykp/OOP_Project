package com.is442.backend.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.is442.backend.dto.*;
import com.is442.backend.service.UserService;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // Get All Patients
    @GetMapping("/patients")
    public ResponseEntity<List<PatientResponse>> getAllPatients() {
        List<PatientResponse> patients = userService.getAllPatients();
        return ResponseEntity.ok(patients);
    }

    // Get All Staff
    @GetMapping("/staff")
    public ResponseEntity<List<StaffResponse>> getAllClinicStaff() {
        List<StaffResponse> staff = userService.getAllClinicStaff();
        return ResponseEntity.ok(staff);
    }

    // Update Patient details
    @PatchMapping("/patient/{id}")
    public ResponseEntity<PatientResponse> updatePatient(@PathVariable UUID id,
            @RequestBody PatientRequest patientRequest) {
        try {
            PatientResponse updatedPatient = userService.updatePatient(id, patientRequest);
            return ResponseEntity.ok(updatedPatient);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Update Patient details
    @PatchMapping("/staff/{id}")
    public ResponseEntity<StaffResponse> updateStaff(@PathVariable UUID id,
            @RequestBody StaffRequest staffRequest) {
        try {
            StaffResponse updatedStaff = userService.updateStaff(id, staffRequest);
            return ResponseEntity.ok(updatedStaff);
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Delete User
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable UUID id) {
        try {
            userService.deleteUser(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    // Exception Handling
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleException(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ex.getMessage());
    }

}
