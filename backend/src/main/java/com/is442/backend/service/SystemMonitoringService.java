package com.is442.backend.service;

import com.is442.backend.dto.QueueStateDto;
import com.is442.backend.model.Appointment;
import com.is442.backend.repository.AppointmentRepository;
import com.is442.backend.repository.GpClinicRepository;
import com.is442.backend.repository.SpecialistClinicRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SystemMonitoringService {

    private final AppointmentRepository appointmentRepository;
    private final RedisQueueService redisQueueService;
    private final GpClinicRepository gpClinicRepository;
    private final SpecialistClinicRepository specialistClinicRepository;

    @Autowired
    public SystemMonitoringService(
            AppointmentRepository appointmentRepository,
            RedisQueueService redisQueueService,
            @Nullable GpClinicRepository gpClinicRepository,
            @Nullable SpecialistClinicRepository specialistClinicRepository) {
        this.appointmentRepository = appointmentRepository;
        this.redisQueueService = redisQueueService;
        this.gpClinicRepository = gpClinicRepository;
        this.specialistClinicRepository = specialistClinicRepository;
    }

    /**
     * Get overall system statistics including appointment counts by status,
     * cancellations, and queue statistics.
     */
    public Map<String, Object> getSystemStatistics() {
        Map<String, Object> stats = new LinkedHashMap<>();

        try {
            // Get all appointments
            List<Appointment> allAppointments = appointmentRepository.findAll();

            // Count appointments by status
            Map<String, Long> statusCounts = allAppointments.stream()
                    .collect(Collectors.groupingBy(
                            Appointment::getStatus,
                            Collectors.counting()));

            stats.put("totalAppointments", allAppointments.size());
            stats.put("statusCounts", statusCounts);

            // Specific counts
            long booked = statusCounts.getOrDefault("SCHEDULED", 0L);
            long cancelled = statusCounts.getOrDefault("CANCELLED", 0L);
            long completed = statusCounts.getOrDefault("COMPLETED", 0L);
            long checkedIn = statusCounts.getOrDefault("CHECKED-IN", 0L);
            long inConsultation = statusCounts.getOrDefault("IN_CONSULTATION", 0L);
            long noShow = statusCounts.getOrDefault("NO_SHOW", 0L);
            long walkIn = allAppointments.stream()
                    .filter(a -> "WALK_IN".equals(a.getType()))
                    .count();

            stats.put("booked", booked);
            stats.put("cancelled", cancelled);
            stats.put("completed", completed);
            stats.put("checkedIn", checkedIn);
            stats.put("inConsultation", inConsultation);
            stats.put("noShow", noShow);
            stats.put("walkIn", walkIn);

            // Today's statistics
            LocalDate today = LocalDate.now();
            long todayTotal = appointmentRepository.findByBookingDate(today).size();
            long todayScheduled = appointmentRepository.findByBookingDate(today).stream()
                    .filter(a -> "SCHEDULED".equals(a.getStatus()))
                    .count();
            long todayCompleted = appointmentRepository.findByBookingDate(today).stream()
                    .filter(a -> "COMPLETED".equals(a.getStatus()))
                    .count();

            stats.put("todayTotal", todayTotal);
            stats.put("todayScheduled", todayScheduled);
            stats.put("todayCompleted", todayCompleted);

            // Queue statistics
            Map<String, Object> queueStats = getQueueStatistics();
            stats.put("queueStatistics", queueStats);

            return stats;
        } catch (Exception e) {
            System.err.println("Error in getSystemStatistics: " + e.getMessage());
            e.printStackTrace();
            // Return error response with empty queue stats
            Map<String, Object> errorStats = new LinkedHashMap<>();
            errorStats.put("error", "Error retrieving statistics: " + e.getMessage());
            errorStats.put("totalAppointments", 0);
            errorStats.put("booked", 0);
            errorStats.put("cancelled", 0);
            errorStats.put("completed", 0);
            errorStats.put("checkedIn", 0);
            errorStats.put("inConsultation", 0);
            errorStats.put("noShow", 0);
            errorStats.put("walkIn", 0);
            errorStats.put("todayTotal", 0);
            errorStats.put("todayScheduled", 0);
            errorStats.put("todayCompleted", 0);
            // Try to get queue stats separately, but catch any errors
            try {
                errorStats.put("queueStatistics", getQueueStatistics());
            } catch (Exception queueError) {
                System.err.println("Error getting queue statistics: " + queueError.getMessage());
                Map<String, Object> emptyQueueStats = new LinkedHashMap<>();
                emptyQueueStats.put("totalActiveQueues", 0);
                emptyQueueStats.put("totalWaiting", 0);
                emptyQueueStats.put("clinicQueues", new ArrayList<>());
                errorStats.put("queueStatistics", emptyQueueStats);
            }
            return errorStats;
        }
    }

    /**
     * Get queue statistics for all active clinics.
     */
    public Map<String, Object> getQueueStatistics() {
        Map<String, Object> queueStats = new LinkedHashMap<>();

        try {
            if (redisQueueService == null) {
                System.err.println("RedisQueueService is null");
                queueStats.put("totalActiveQueues", 0);
                queueStats.put("totalWaiting", 0);
                queueStats.put("clinicQueues", new ArrayList<>());
                queueStats.put("error", "Redis queue service not available");
                return queueStats;
            }

            // Get all clinic IDs from Redis
            Set<String> clinicIds = redisQueueService.listClinics();
            
            if (clinicIds == null) {
                clinicIds = new HashSet<>();
            }

            List<Map<String, Object>> clinicQueueStats = new ArrayList<>();
            int totalWaiting = 0;
            int totalActiveQueues = 0;

            for (String clinicId : clinicIds) {
                try {
                    if (clinicId == null || clinicId.trim().isEmpty()) {
                        continue;
                    }
                    var status = redisQueueService.getQueueStatus(clinicId);
                    if (status != null) {
                        if (status.getTotalWaiting() > 0) {
                            totalActiveQueues++;
                        }
                        totalWaiting += status.getTotalWaiting();

                        Map<String, Object> clinicStat = new LinkedHashMap<>();
                        clinicStat.put("clinicId", clinicId);
                        clinicStat.put("nowServing", status.getNowServing());
                        clinicStat.put("totalWaiting", status.getTotalWaiting());
                        clinicQueueStats.add(clinicStat);
                    }
                } catch (Exception e) {
                    // Log but continue with other clinics
                    System.err.println("Error getting queue status for clinic " + clinicId + ": " + e.getMessage());
                    e.printStackTrace();
                }
            }

            queueStats.put("totalActiveQueues", totalActiveQueues);
            queueStats.put("totalWaiting", totalWaiting);
            queueStats.put("clinicQueues", clinicQueueStats);
        } catch (Exception e) {
            System.err.println("Error getting queue statistics: " + e.getMessage());
            queueStats.put("totalActiveQueues", 0);
            queueStats.put("totalWaiting", 0);
            queueStats.put("clinicQueues", new ArrayList<>());
        }

        return queueStats;
    }

    /**
     * Get all queue states for all active clinics.
     */
    public Map<String, Object> getAllQueueStates() {
        Map<String, Object> result = new LinkedHashMap<>();

        try {
            if (redisQueueService == null) {
                System.err.println("RedisQueueService is null in getAllQueueStates");
                result.put("totalClinics", 0);
                result.put("queueStates", new ArrayList<>());
                result.put("error", "Redis queue service not available");
                return result;
            }

            // Get all clinic IDs from Redis
            Set<String> clinicIds = redisQueueService.listClinics();
            
            if (clinicIds == null) {
                clinicIds = new HashSet<>();
            }

            List<Map<String, Object>> allQueueStates = new ArrayList<>();

            for (String clinicId : clinicIds) {
                try {
                    if (clinicId == null || clinicId.trim().isEmpty()) {
                        continue;
                    }
                    QueueStateDto state = redisQueueService.getQueueState(clinicId);
                    if (state == null) {
                        continue;
                    }

                    Map<String, Object> queueState = new LinkedHashMap<>();
                    queueState.put("clinicId", state.getClinicId() != null ? state.getClinicId() : clinicId);
                    queueState.put("nowServing", state.getNowServing());
                    queueState.put("totalWaiting", state.getTotalWaiting());

                    // Convert queue items to list of maps
                    List<Map<String, Object>> queueItemsList = new ArrayList<>();
                    if (state.getQueueItems() != null) {
                        for (var item : state.getQueueItems()) {
                            if (item != null) {
                                Map<String, Object> itemMap = new LinkedHashMap<>();
                                itemMap.put("appointmentId", item.getAppointmentId() != null ? item.getAppointmentId() : "");
                                itemMap.put("patientId", item.getPatientId() != null ? item.getPatientId() : "");
                                itemMap.put("patientName", item.getPatientName() != null ? item.getPatientName() : "");
                                itemMap.put("email", item.getEmail() != null ? item.getEmail() : "");
                                itemMap.put("phone", item.getPhone() != null ? item.getPhone() : "");
                                itemMap.put("position", item.getPosition());
                                itemMap.put("queueNumber", item.getQueueNumber());
                                itemMap.put("doctorId", item.getDoctorId() != null ? item.getDoctorId() : "");
                                itemMap.put("doctorName", item.getDoctorName() != null ? item.getDoctorName() : "");
                                itemMap.put("doctorSpeciality", item.getDoctorSpeciality() != null ? item.getDoctorSpeciality() : "");
                                itemMap.put("createdAt", item.getCreatedAt() != null ? item.getCreatedAt() : "");
                                queueItemsList.add(itemMap);
                            }
                        }
                    }
                    queueState.put("queueItems", queueItemsList);

                    allQueueStates.add(queueState);
                } catch (Exception e) {
                    // Log but continue with other clinics
                    System.err.println("Error getting queue state for clinic " + clinicId + ": " + e.getMessage());
                    e.printStackTrace();
                }
            }

            result.put("totalClinics", clinicIds.size());
            result.put("queueStates", allQueueStates);
        } catch (Exception e) {
            System.err.println("Error getting all queue states: " + e.getMessage());
            result.put("totalClinics", 0);
            result.put("queueStates", new ArrayList<>());
        }

        return result;
    }

    /**
     * Create a backup of system data.
     * Returns a map containing all relevant data for backup.
     */
    public Map<String, Object> createBackup() {
        Map<String, Object> backup = new LinkedHashMap<>();

        try {
            // Backup appointments
            List<Appointment> appointments = appointmentRepository.findAll();
            List<Map<String, Object>> appointmentData = appointments.stream()
                    .map(this::appointmentToMap)
                    .collect(Collectors.toList());
            backup.put("appointments", appointmentData);

            // Backup queue states
            Map<String, Object> queueStates = getAllQueueStates();
            backup.put("queueStates", queueStates);

            // Backup timestamp
            backup.put("backupTimestamp", System.currentTimeMillis());
            backup.put("backupDate", LocalDate.now().toString());

            return backup;
        } catch (Exception e) {
            throw new RuntimeException("Failed to create backup: " + e.getMessage(), e);
        }
    }

    /**
     * Convert Appointment entity to Map for backup.
     */
    private Map<String, Object> appointmentToMap(Appointment appointment) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("appointmentId", appointment.getAppointmentId().toString());
        map.put("patientId", appointment.getPatientId());
        map.put("doctorId", appointment.getDoctorId());
        map.put("clinicId", appointment.getClinicId());
        map.put("bookingDate", appointment.getBookingDate().toString());
        map.put("startTime", appointment.getStartTime() != null ? appointment.getStartTime().toString() : null);
        map.put("endTime", appointment.getEndTime() != null ? appointment.getEndTime().toString() : null);
        map.put("status", appointment.getStatus());
        map.put("type", appointment.getType());
        map.put("createdAt", appointment.getCreatedAt() != null ? appointment.getCreatedAt().toString() : null);
        map.put("updatedAt", appointment.getUpdatedAt() != null ? appointment.getUpdatedAt().toString() : null);
        return map;
    }

    /**
     * Restore data from backup.
     * Note: This is a simplified implementation. In production, you'd want
     * more sophisticated restore logic with validation and transaction management.
     */
    public Map<String, Object> restoreFromBackup(Map<String, Object> backupData) {
        Map<String, Object> result = new LinkedHashMap<>();

        try {
            // Validate backup data
            if (backupData == null || backupData.isEmpty()) {
                throw new IllegalArgumentException("Backup data is empty or null");
            }

            // Note: Full restore would require:
            // 1. Validating backup format
            // 2. Clearing existing data (if needed)
            // 3. Restoring appointments
            // 4. Restoring queue states to Redis
            // 
            // For now, we'll just return a success message indicating the backup was received.
            // Actual restore implementation would depend on your specific requirements.

            result.put("status", "success");
            result.put("message", "Backup data received. Restore functionality requires additional implementation.");
            result.put("backupTimestamp", backupData.get("backupTimestamp"));
            result.put("backupDate", backupData.get("backupDate"));

            return result;
        } catch (Exception e) {
            throw new RuntimeException("Failed to restore from backup: " + e.getMessage(), e);
        }
    }
}

