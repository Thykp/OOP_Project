package com.is442.backend.controller;

import com.is442.backend.dto.ErrorResponse;
import com.is442.backend.service.SystemMonitoringService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/system")
@CrossOrigin(origins = "http://localhost:5173")
public class SystemMonitoringController {

    private final SystemMonitoringService systemMonitoringService;

    @Autowired
    public SystemMonitoringController(SystemMonitoringService systemMonitoringService) {
        this.systemMonitoringService = systemMonitoringService;
    }

    /**
     * GET /api/admin/system/stats
     * Get overall system statistics including appointments, cancellations, and queue stats.
     */
    @GetMapping("/stats")
    public ResponseEntity<?> getSystemStatistics() {
        try {
            Map<String, Object> stats = systemMonitoringService.getSystemStatistics();
            if (stats == null) {
                stats = new java.util.HashMap<>();
                stats.put("error", "No statistics available");
            }
            return ResponseEntity.ok()
                    .header("Content-Type", "application/json")
                    .body(stats);
        } catch (Exception e) {
            e.printStackTrace();
            ErrorResponse error = new ErrorResponse("Error retrieving system statistics: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .header("Content-Type", "application/json")
                    .body(error);
        }
    }

    /**
     * GET /api/admin/system/queues
     * Get all queue states for all active clinics.
     */
    @GetMapping("/queues")
    public ResponseEntity<?> getAllQueueStates() {
        try {
            Map<String, Object> queueStates = systemMonitoringService.getAllQueueStates();
            if (queueStates == null) {
                queueStates = new java.util.HashMap<>();
                queueStates.put("totalClinics", 0);
                queueStates.put("queueStates", new java.util.ArrayList<>());
            }
            return ResponseEntity.ok()
                    .header("Content-Type", "application/json")
                    .body(queueStates);
        } catch (Exception e) {
            e.printStackTrace();
            ErrorResponse error = new ErrorResponse("Error retrieving queue states: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .header("Content-Type", "application/json")
                    .body(error);
        }
    }

    /**
     * GET /api/admin/system/queue-stats
     * Get queue statistics summary.
     */
    @GetMapping("/queue-stats")
    public ResponseEntity<?> getQueueStatistics() {
        try {
            Map<String, Object> queueStats = systemMonitoringService.getQueueStatistics();
            return ResponseEntity.ok(queueStats);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error retrieving queue statistics: " + e.getMessage()));
        }
    }

    /**
     * POST /api/admin/system/backup
     * Create a backup of system data.
     */
    @PostMapping("/backup")
    public ResponseEntity<?> createBackup() {
        try {
            Map<String, Object> backup = systemMonitoringService.createBackup();
            return ResponseEntity.ok(backup);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error creating backup: " + e.getMessage()));
        }
    }

    /**
     * POST /api/admin/system/restore
     * Restore data from backup.
     */
    @PostMapping("/restore")
    public ResponseEntity<?> restoreFromBackup(@RequestBody Map<String, Object> backupData) {
        try {
            Map<String, Object> result = systemMonitoringService.restoreFromBackup(backupData);
            return ResponseEntity.ok(result);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error restoring from backup: " + e.getMessage()));
        }
    }
}

