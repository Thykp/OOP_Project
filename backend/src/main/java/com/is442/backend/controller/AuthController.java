package com.is442.backend.controller;

import com.is442.backend.model.*;
import com.is442.backend.service.*;
import com.is442.backend.dto.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

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


                    //specific patient details
                    patient.setPhone(dto.getPhone());
                    patient.setGender(dto.getGender());
                    patient.setDateOfBirth(dto.getDateOfBirth());
                    


                    return ResponseEntity.ok(userService.registerUser(patient));
                }
                case "ROLE_STAFF" -> {
                    ClinicStaff staff = new ClinicStaff();
                    staff.setSupabaseUserId(dto.getSupabaseUserId());
                    staff.setEmail(dto.getEmail());
                    staff.setFirstName(dto.getFirstName());
                    staff.setLastName(dto.getLastName());
                    staff.setRole("ROLE_STAFF");
                    return ResponseEntity.ok(userService.registerUser(staff));
                }
                case "ROLE_ADMIN" -> {
                    SystemAdministrator admin = new SystemAdministrator();
                    admin.setSupabaseUserId(dto.getSupabaseUserId());
                    admin.setEmail(dto.getEmail());
                    admin.setFirstName(dto.getFirstName());
                    admin.setLastName(dto.getLastName());
                    admin.setRole("ROLE_ADMIN");
                    return ResponseEntity.ok(userService.registerUser(admin));
                }
                default -> throw new IllegalArgumentException("Invalid role");
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error registering user: " + e.getMessage());
        }
    }
}
