package com.is442.backend.controller;

import com.is442.backend.dto.StaffReportRequest;
import com.is442.backend.dto.StaffReportResponse;
import com.is442.backend.service.StaffReportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/staff/reports")
public class StaffReportController {

    @Autowired
    private StaffReportService staffReportService;

    /**
     * Generate a new daily report
     * POST /api/staff/reports/generate
     */
    @PostMapping("/generate")
    public ResponseEntity<?> generateReport(
            @RequestBody StaffReportRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userId) {
        try {
            if (request.getClinicId() == null || request.getClinicId().isBlank()) {
                return ResponseEntity.badRequest().body("Clinic ID is required");
            }
            if (request.getReportDate() == null) {
                return ResponseEntity.badRequest().body("Report date is required");
            }
            if (userId == null || userId.isBlank()) {
                return ResponseEntity.badRequest().body("User ID is required in X-User-Id header");
            }

            StaffReportResponse report = staffReportService.generateDailyReport(
                    request.getClinicId(),
                    request.getReportDate(),
                    userId
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(report);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error generating report: " + e.getMessage());
        }
    }

    /**
     * Get report for a specific date
     * GET /api/staff/reports/{date}
     */
    @GetMapping("/{date}")
    public ResponseEntity<?> getReportByDate(
            @PathVariable String date,
            @RequestParam String clinicId) {
        try {
            LocalDate reportDate = LocalDate.parse(date);
            StaffReportResponse report = staffReportService.getReportByDate(clinicId, reportDate);
            return ResponseEntity.ok(report);
        } catch (java.time.format.DateTimeParseException e) {
            return ResponseEntity.badRequest().body("Invalid date format. Use YYYY-MM-DD");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving report: " + e.getMessage());
        }
    }

    /**
     * Get all past reports for a clinic
     * GET /api/staff/reports?clinicId={clinicId}
     */
    @GetMapping
    public ResponseEntity<?> getPastReports(@RequestParam String clinicId) {
        try {
            List<StaffReportResponse> reports = staffReportService.getPastReports(clinicId);
            return ResponseEntity.ok(reports);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving reports: " + e.getMessage());
        }
    }

    /**
     * Download PDF for a report
     * GET /api/staff/reports/{reportId}/download
     */
    @GetMapping("/{reportId}/download")
    public ResponseEntity<?> downloadReportPdf(@PathVariable Long reportId) {
        try {
            byte[] pdfBytes = staffReportService.downloadReportPdf(reportId);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", "report_" + reportId + ".pdf");
            headers.setContentLength(pdfBytes.length);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(pdfBytes);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error downloading PDF: " + e.getMessage());
        }
    }

    /**
     * Delete a report
     * DELETE /api/staff/reports/{reportId}
     */
    @DeleteMapping("/{reportId}")
    public ResponseEntity<?> deleteReport(
            @PathVariable Long reportId,
            @RequestParam String clinicId) {
        try {
            if (clinicId == null || clinicId.isBlank()) {
                return ResponseEntity.badRequest().body("Clinic ID is required");
            }

            staffReportService.deleteReport(reportId, clinicId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error deleting report: " + e.getMessage());
        }
    }
}

