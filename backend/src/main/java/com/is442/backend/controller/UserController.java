package com.is442.backend.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.is442.backend.dto.PatientRequest;
import com.is442.backend.dto.PatientResponse;
import com.is442.backend.dto.StaffRequest;
import com.is442.backend.dto.StaffResponse;
import com.is442.backend.service.UserService;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {
    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // Search patients by partial email for autocomplete suggestions
    @GetMapping("/patients/search")
    public ResponseEntity<List<PatientResponse>> searchPatients(@RequestParam("q") String query) {
        List<PatientResponse> matches = userService.searchPatientsByEmail(query);
        return ResponseEntity.ok(matches);
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

    // Get single patient by email
    @GetMapping("/patient/email/{email}")
    public ResponseEntity<PatientResponse> getPatientByEmail(@PathVariable String email) {
        try {
            PatientResponse patient = userService.findPatientByEmail(email);
            return ResponseEntity.ok(patient);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    // Get single staff by Supabase user UUID (primary key)
    @GetMapping("/staff/{supabaseUserId}")
    public ResponseEntity<StaffResponse> getStaffBySupabaseId(@PathVariable UUID supabaseUserId) {
        try {
            var user = userService.findBySupabaseUserId(supabaseUserId);
            if (!(user instanceof com.is442.backend.model.ClinicStaff staff)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
            return ResponseEntity.ok(new StaffResponse(staff));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
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
