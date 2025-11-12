package com.is442.backend.controller;

import com.is442.backend.dto.ErrorResponse;
import com.is442.backend.service.AppointmentService;
import com.is442.backend.service.KafkaQueueEventProducer;
import com.is442.backend.service.RedisQueueService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.lang.Nullable;
import org.springframework.web.bind.annotation.*;
import com.is442.backend.dto.QueueEvent;
import com.is442.backend.dto.CallNextResult;
import com.is442.backend.dto.PositionSnapshot;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/queue")
public class RedisQueueController {

    private final RedisQueueService redisQueueService;
    private final KafkaQueueEventProducer events;

    @Autowired(required = false)
    private AppointmentService appointmentService;

    public RedisQueueController(RedisQueueService redisQueueService,
            @Nullable KafkaQueueEventProducer events) {
        this.redisQueueService = redisQueueService;
        this.events = events;
    }

    // POST /checkin — returns dynamic position + stable queueNumber
    @PostMapping("/checkin")
    public ResponseEntity<?> checkin(@RequestBody Map<String, Object> body) {
        try {
            // Validate request body
            if (body == null) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("Request body cannot be null"));
            }

            String clinicId = String.valueOf(body.get("clinicId"));
            if (clinicId == null || clinicId.equals("null") || clinicId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("clinicId is required"));
            }

            Object appointmentIdObj = body.get("appointmentId");
            boolean appointmentProvided = (appointmentIdObj != null
                    && !String.valueOf(appointmentIdObj).equals("null")
                    && !String.valueOf(appointmentIdObj).isEmpty());

            String appointmentId = appointmentProvided
                    ? String.valueOf(appointmentIdObj)
                    : UUID.randomUUID().toString();

            String patientId = String.valueOf(body.get("patientId"));
            if (patientId == null || patientId.equals("null") || patientId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("patientId is required"));
            }

            // Extract optional doctorId from JSON body currently optional => will make it
            // required in the future
            Object doctorIdObj = body.get("doctorId");
            String doctorId = (doctorIdObj != null
                    && !String.valueOf(doctorIdObj).equals("null")
                    && !String.valueOf(doctorIdObj).toString().trim().isEmpty())
                            ? String.valueOf(doctorIdObj)
                            : null;

            // Service computes both
            // Only validate appointment if it was provided by the user (not auto-generated)
            RedisQueueService.CheckinResult result = redisQueueService.checkIn(
                    clinicId, appointmentId, patientId, appointmentProvided, doctorId);

            // If appointment was auto-generated (walk-in), create it asynchronously in the
            // background
            if (!appointmentProvided && appointmentService != null) {
                try {
                    UUID appointmentUuid = UUID.fromString(appointmentId);
                    // Use provided doctorId or default to UNASSIGNED
                    String doctorIdForAppointment = (doctorId != null && !doctorId.trim().isEmpty())
                            ? doctorId
                            : "UNASSIGNED";
                    appointmentService.createWalkInAppointmentAsync(appointmentUuid, patientId, clinicId,
                            doctorIdForAppointment);
                } catch (IllegalArgumentException e) {
                    // Log but don't fail the check-in if UUID parsing fails
                    // This shouldn't happen since we just generated it, but handle gracefully
                }
            } else if (appointmentProvided && appointmentService != null) {
                // For booked appointments, update status to CHECKED-IN asynchronously
                try {
                    UUID appointmentUuid = UUID.fromString(appointmentId);
                    appointmentService.updateAppointmentStatusToCheckedInAsync(appointmentUuid);
                } catch (IllegalArgumentException e) {
                    // Log but don't fail the check-in if UUID parsing fails
                }

                // Also update doctor_id if provided
                if (doctorId != null && !doctorId.trim().isEmpty()) {
                    try {
                        UUID appointmentUuid = UUID.fromString(appointmentId);
                        boolean updated = appointmentService.updateAppointmentDoctorId(appointmentUuid, doctorId);
                        if (!updated) {
                            // Appointment doesn't exist - this shouldn't happen for provided appointments
                            // but handle gracefully
                        }
                    } catch (Exception e) {
                        // Log but don't fail the check-in if update fails
                        // This is a non-critical operation
                    }
                }
            }

            // Publish real-time event (keeps same payload shape)
            if (events != null) {
                events.publishQueueEvent(new QueueEvent(
                        "POSITION_CHANGED", clinicId, appointmentId, patientId,
                        result.position(), result.queueNumber(), System.currentTimeMillis()),
                        doctorId); // Pass doctorId for Kafka headers
            }

            return ResponseEntity.ok(Map.of(
                    "status", "ok",
                    "position", result.position(), // live place in line
                    "queueNumber", result.queueNumber(), // stable ticket (seq)
                    "appointmentId", appointmentId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse(e.getMessage()));
        } catch (RuntimeException e) {
            // Handle user not found or appointment not found
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ErrorResponse(e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error during check-in: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Unexpected error during check-in: " + e.getMessage()));
        }
    }

    // POST /call-next — returns the actual nowServing ticket + the dequeued
    // patient's ticket
    @PostMapping("/call-next")
    public ResponseEntity<?> callNext(@RequestBody Map<String, Object> body) {
        try {
            // Validate request body
            if (body == null) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("Request body cannot be null"));
            }

            String clinicId = (String) body.get("clinicId");
            if (clinicId == null || clinicId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("clinicId is required"));
            }

            // Extract optional doctorId from JSON body
            Object doctorIdObj = body.get("doctorId");
            String doctorId = (doctorIdObj != null
                    && !String.valueOf(doctorIdObj).equals("null")
                    && !String.valueOf(doctorIdObj).toString().trim().isEmpty())
                            ? String.valueOf(doctorIdObj)
                            : null;

            CallNextResult result = redisQueueService.callNext(clinicId, doctorId);

            // Check if queue is empty
            if (result.appointmentId() == null || result.appointmentId().isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "status", "ok",
                        "message", "Queue is empty",
                        "nowServing", result.nowServing(),
                        "appointmentId", ""));
            }

            // Get final doctorId (from request or from Redis metadata)
            String finalDoctorId = doctorId;
            if (finalDoctorId == null || finalDoctorId.trim().isEmpty()) {
                finalDoctorId = redisQueueService.getDoctorIdFromAppointment(result.appointmentId());
            }

            // Publish event using the actual nowServing ticket number
            if (events != null) {
                events.publishQueueEvent(new QueueEvent(
                        "NOW_SERVING",
                        clinicId,
                        result.appointmentId(),
                        result.patientId(),
                        (int) result.nowServing(),
                        result.queueNumber(),
                        System.currentTimeMillis()),
                        finalDoctorId); // Pass doctorId for Kafka headers
            }

            return ResponseEntity.ok(Map.of(
                    "status", "ok",
                    "nowServing", result.nowServing(), // clinic-wide current ticket
                    "appointmentId", result.appointmentId()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error calling next patient: " + e.getMessage()));
        }
    }

    // GET /me — return both position (dynamic), nowServing (clinic-wide), and my
    // queueNumber (stable)
    @GetMapping("/me")
    public ResponseEntity<?> myPosition(@RequestParam String appointmentId) {
        try {
            // Validate appointmentId parameter
            if (appointmentId == null || appointmentId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("appointmentId parameter is required"));
            }

            PositionSnapshot snapshot = redisQueueService.getCurrentPosition(appointmentId);
            long queueNumber = redisQueueService.getQueueNumber(appointmentId); // stable ticket from hash

            // Check if appointment exists in queue
            if (snapshot.getClinicId() == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ErrorResponse("Appointment not found in queue: " + appointmentId));
            }

            return ResponseEntity.ok(Map.of(
                    "clinicId", snapshot.getClinicId() != null ? snapshot.getClinicId() : "",
                    "position", snapshot.getPosition(),
                    "nowServing", snapshot.getNowServing(),
                    "queueNumber", queueNumber));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error retrieving position: " + e.getMessage()));
        }
    }

    // GET /status/{clinicId} — unchanged API shape
    @GetMapping("/status/{clinicId}")
    public ResponseEntity<?> queueStatus(@PathVariable String clinicId) {
        try {
            // Validate clinicId parameter
            if (clinicId == null || clinicId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("clinicId path variable is required"));
            }

            var status = redisQueueService.getQueueStatus(clinicId);
            return ResponseEntity.ok(Map.of(
                    "clinicId", status.getClinicId(),
                    "nowServing", status.getNowServing(),
                    "totalWaiting", status.getTotalWaiting()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error retrieving queue status: " + e.getMessage()));
        }
    }

    // GET /state/{clinicId} — returns complete queue state with all queue items
    @GetMapping("/state/{clinicId}")
    public ResponseEntity<?> queueState(@PathVariable String clinicId) {
        try {
            // Validate clinicId parameter
            if (clinicId == null || clinicId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("clinicId path variable is required"));
            }

            var state = redisQueueService.getQueueState(clinicId);
            
            // Build response map with queue state
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("clinicId", state.getClinicId());
            response.put("nowServing", state.getNowServing());
            response.put("totalWaiting", state.getTotalWaiting());
            
            // Convert queue items to list of maps
            List<Map<String, Object>> queueItemsList = new ArrayList<>();
            for (var item : state.getQueueItems()) {
                Map<String, Object> itemMap = new LinkedHashMap<>();
                itemMap.put("appointmentId", item.getAppointmentId());
                itemMap.put("patientId", item.getPatientId());
                itemMap.put("patientName", item.getPatientName());
                itemMap.put("email", item.getEmail());
                itemMap.put("phone", item.getPhone());
                itemMap.put("position", item.getPosition());
                itemMap.put("queueNumber", item.getQueueNumber());
                itemMap.put("doctorId", item.getDoctorId());
                itemMap.put("doctorName", item.getDoctorName());
                itemMap.put("doctorSpeciality", item.getDoctorSpeciality());
                itemMap.put("createdAt", item.getCreatedAt());
                queueItemsList.add(itemMap);
            }
            response.put("queueItems", queueItemsList);
            
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error retrieving queue state: " + e.getMessage()));
        }
    }

    // GET /reset/{clinicId} — soft reset (seq -> 0); optional: also zero nowServing
    // if you want
    @GetMapping("/reset/{clinicId}")
    public ResponseEntity<?> resetQnumber(@PathVariable String clinicId) {
        try {
            // Validate clinicId parameter
            if (clinicId == null || clinicId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("clinicId path variable is required"));
            }

            redisQueueService.resetQnumber(clinicId);
            return ResponseEntity.ok(Map.of("status", "ok"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error resetting queue: " + e.getMessage()));
        }
    }

    // POST /fast-track — moves an appointment to the top of the queue
    @PostMapping("/fast-forward")
    public ResponseEntity<?> fastTrack(@RequestBody Map<String, Object> body) {
        try {
            // Validate request body
            if (body == null) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("Request body cannot be null"));
            }

            Object appointmentIdObj = body.get("appointmentId");
            if (appointmentIdObj == null) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("appointmentId is required"));
            }

            String appointmentId = String.valueOf(appointmentIdObj);
            if (appointmentId == null || appointmentId.equals("null") || appointmentId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new ErrorResponse("appointmentId is required"));
            }

            // Fast-track the appointment
            int newPosition = redisQueueService.fastTrack(appointmentId);

            // Get updated position snapshot for response
            PositionSnapshot snapshot = redisQueueService.getCurrentPosition(appointmentId);
            long queueNumber = redisQueueService.getQueueNumber(appointmentId);

            return ResponseEntity.ok(Map.of(
                    "status", "ok",
                    "appointmentId", appointmentId,
                    "position", newPosition,
                    "queueNumber", queueNumber,
                    "clinicId", snapshot.getClinicId() != null ? snapshot.getClinicId() : "",
                    "nowServing", snapshot.getNowServing()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(new ErrorResponse(e.getMessage()));
        } catch (RuntimeException e) {
            // Handle appointment not found or not in queue
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new ErrorResponse(e.getMessage()));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Error fast-tracking appointment: " + e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("Unexpected error during fast-track: " + e.getMessage()));
        }
    }
}
