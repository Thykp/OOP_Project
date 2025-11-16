// ClinicController.java
package com.is442.backend.controller;

import com.is442.backend.dto.GpClinicDto;
import com.is442.backend.dto.SpecialistClinicDto;
import com.is442.backend.dto.StaffRequest;
import com.is442.backend.dto.StaffResponse;
import com.is442.backend.service.ClinicService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Validated
@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/clinics")
public class ClinicController {
    private final ClinicService clinicService;

    public ClinicController(ClinicService clinicService) {
        this.clinicService = clinicService;
    }

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

    // Update GP operating hours
    @PatchMapping("/gp/{id}/operatingHour")
    public ResponseEntity<GpClinicDto> updateGPOperatingHours(@PathVariable int id,
                                                              @RequestBody GpClinicDto req) {
        try {
            clinicService.updateGPClinicOperatingHours(id, req);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Update Specialist operating hours
    @PatchMapping("/specialist/{id}/operatingHour")
    public ResponseEntity<SpecialistClinicDto> updateSpecialistOperatingHours(
            @PathVariable int id,
            @RequestBody SpecialistClinicDto req) {
        try {
            clinicService.updateSpecialistClinicOperatingHours(id, req);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            e.printStackTrace(); // Prints full trace to the app log
            throw e; // or return ResponseEntity with error
            // return ResponseEntity.notFound().build();
        }
    }

}
