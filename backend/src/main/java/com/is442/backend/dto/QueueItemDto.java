package com.is442.backend.dto;

import java.util.Map;

/**
 * Represents a single item in the queue with all its details.
 */
public class QueueItemDto {
    private final String appointmentId;
    private final String patientId;
    private final String patientName;
    private final String email;
    private final String phone;
    private final int position;
    private final long queueNumber;
    private final String doctorId;
    private final String doctorName;
    private final String doctorSpeciality;
    private final String createdAt;

    public QueueItemDto(String appointmentId, String patientId, String patientName, String email, String phone,
                        int position, long queueNumber, String doctorId, String doctorName, String doctorSpeciality,
                        String createdAt) {
        this.appointmentId = appointmentId;
        this.patientId = patientId;
        this.patientName = patientName;
        this.email = email;
        this.phone = phone;
        this.position = position;
        this.queueNumber = queueNumber;
        this.doctorId = doctorId;
        this.doctorName = doctorName;
        this.doctorSpeciality = doctorSpeciality;
        this.createdAt = createdAt;
    }

    // Factory method to create from Redis hash metadata
    public static QueueItemDto fromRedisMetadata(String appointmentId, Map<Object, Object> meta, int position) {
        String patientId = getString(meta, "patientId", "");
        String patientName = getString(meta, "name", "");
        String email = getString(meta, "email", "");
        String phone = getString(meta, "phone", "");
        long queueNumber = parseLong(getString(meta, "seq", "0"), 0L);
        String doctorId = getString(meta, "doctorId", "");
        String doctorName = getString(meta, "doctorName", "");
        String doctorSpeciality = getString(meta, "doctorSpeciality", "");
        String createdAt = getString(meta, "createdAt", "");

        return new QueueItemDto(appointmentId, patientId, patientName, email, phone, position, queueNumber, doctorId,
                doctorName, doctorSpeciality, createdAt);
    }

    private static String getString(Map<Object, Object> meta, String key, String defaultValue) {
        Object value = meta.get(key);
        if (value == null) {
            return defaultValue;
        }
        String str = value.toString();
        return str.trim().isEmpty() ? defaultValue : str;
    }

    private static long parseLong(String s, long defaultValue) {
        try {
            return (s == null || s.trim().isEmpty()) ? defaultValue : Long.parseLong(s);
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    // Getters
    public String getAppointmentId() {
        return appointmentId;
    }

    public String getPatientId() {
        return patientId;
    }

    public String getPatientName() {
        return patientName;
    }

    public String getEmail() {
        return email;
    }

    public String getPhone() {
        return phone;
    }

    public int getPosition() {
        return position;
    }

    public long getQueueNumber() {
        return queueNumber;
    }

    public String getDoctorId() {
        return doctorId;
    }

    public String getDoctorName() {
        return doctorName;
    }

    public String getDoctorSpeciality() {
        return doctorSpeciality;
    }

    public String getCreatedAt() {
        return createdAt;
    }
}
