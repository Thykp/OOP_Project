// ClinicController.java
package com.is442.backend.controller;
import com.is442.backend.dto.GpClinicDto; 
import com.is442.backend.dto.SpecialistClinicDto;
import com.is442.backend.service.ClinicService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Validated
@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/clinics")
public class ClinicController {
    private final ClinicService clinicService;

    public ClinicController(ClinicService clinicService) { this.clinicService = clinicService; }

    // endpoint to get clinic dto class
    @GetMapping("/gp")
    public ResponseEntity<List<GpClinicDto>> getGpClinics(
            @RequestParam(defaultValue = "5") @Min(1) @Max(100) int limit) {
        return ResponseEntity.ok(clinicService.getGpClinics(limit));
    }

    @GetMapping("/specialist")
    public ResponseEntity<List<SpecialistClinicDto>> getSpecialistClinics(
            @RequestParam(defaultValue = "5") @Min(1) @Max(100) int limit) {
        return ResponseEntity.ok(clinicService.getSpecialistClinics(limit));
    }
}
