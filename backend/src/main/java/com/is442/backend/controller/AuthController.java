package com.is442.backend.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.is442.backend.dto.SignupRequest;
import com.is442.backend.model.ClinicStaff;
import com.is442.backend.model.Patient;
import com.is442.backend.model.SystemAdministrator;
import com.is442.backend.service.UserService;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private UserService userService;

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@RequestBody SignupRequest dto) {
        try {
            switch (dto.getRole()) {
                case "ROLE_PATIENT" -> {
                    Patient patient = new Patient();
                    patient.setSupabaseUserId(dto.getSupabaseUserId());
                    patient.setEmail(dto.getEmail());
                    patient.setFirstName(dto.getFirstName());
                    patient.setLastName(dto.getLastName());
                    patient.setRole("ROLE_PATIENT");
                    patient.setStatus("ACTIVE");

                    // specific patient details
                    // Set phone in both Patient table and User table (both have phone fields)
                    patient.setPhone(dto.getPhone()); // Sets Patient's phone field
                    // Also set User's phone field using reflection
                    try {
                        java.lang.reflect.Field userPhoneField = com.is442.backend.model.User.class.getDeclaredField("phone");
                        userPhoneField.setAccessible(true);
                        userPhoneField.set(patient, dto.getPhone());
                    } catch (Exception e) {
                        // If reflection fails, at least Patient's phone is set
                        System.err.println("Warning: Could not set User's phone field during signup: " + e.getMessage());
                    }
                    patient.setGender(dto.getGender());
                    patient.setDateOfBirth(dto.getDateOfBirth());

                    return ResponseEntity.ok(userService.registerUser(patient));
                }
                case "ROLE_STAFF" -> {

                    System.out.print(dto.getClinicName());
                    System.out.print(dto.getPosition());
                    if (dto.getClinicName() == null || dto.getClinicName().isEmpty() ||
                            dto.getClinicId() == null || dto.getClinicId().isEmpty() ||
                            dto.getPosition() == null || dto.getPosition().isEmpty()) {
                        // Return error response if any value is missing
                        return ResponseEntity
                                .badRequest()
                                .body("Clinic name, clinic id and position must be provided for staff registration");
                    }
                    ClinicStaff staff = new ClinicStaff();
                    staff.setSupabaseUserId(dto.getSupabaseUserId());
                    staff.setEmail(dto.getEmail());
                    staff.setFirstName(dto.getFirstName());
                    staff.setLastName(dto.getLastName());
                    staff.setRole("ROLE_STAFF");
                    staff.setStatus("ACTIVE");

                    staff.setClinicName(dto.getClinicName());
                    staff.setClinicId(dto.getClinicId());
                    staff.setPosition(dto.getPosition());
                    return ResponseEntity.ok(userService.registerUser(staff));
                }
                case "ROLE_ADMIN" -> {
                    SystemAdministrator admin = new SystemAdministrator();
                    admin.setSupabaseUserId(dto.getSupabaseUserId());
                    admin.setEmail(dto.getEmail());
                    admin.setFirstName(dto.getFirstName());
                    admin.setLastName(dto.getLastName());
                    admin.setStatus("ACTIVE");

                    // admin.setRole("ROLE_ADMIN");
                    return ResponseEntity.ok(userService.registerUser(admin));
                }
                default -> throw new IllegalArgumentException("Invalid role");
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error registering user: " + e.getMessage());
        }
    }
}
