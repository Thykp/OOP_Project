package com.is442.backend.service;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.is442.backend.dto.AvailableDateSlotsDto;
import com.is442.backend.dto.TimeSlotDto;
import com.is442.backend.model.Appointment;
import com.is442.backend.model.Doctor;
import com.is442.backend.model.TimeSlot;
import com.is442.backend.repository.AppointmentRepository;
import com.is442.backend.repository.DoctorRepository;
import com.is442.backend.repository.TimeSlotRepository;

@Service
public class TimeSlotService {
    private final TimeSlotRepository timeSlotRepository;
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;

    public TimeSlotService(TimeSlotRepository timeSlotRepository, AppointmentRepository appointmentRepository, DoctorRepository doctorRepository) {
        this.timeSlotRepository = timeSlotRepository;
        this.appointmentRepository = appointmentRepository;
        this.doctorRepository = doctorRepository;
    }

    public List<TimeSlot> getAllTimeSlots() {
        return timeSlotRepository.findAll();
    }

    // Helper to parse String time to LocalTime
    private LocalTime parseTimeString(String timeStr) {
        if (timeStr == null || timeStr.isBlank()) return null;
        try {
            // Handle various formats: "11:00", "11:00:00", "11:00 AM"
            timeStr = timeStr.trim();
            
            // Remove AM/PM if present (assuming 24-hour format in DB)
            timeStr = timeStr.replaceAll("(?i)\\s*(AM|PM)\\s*$", "");
            
            if (timeStr.length() == 5) {
                // "11:00" format
                return LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm"));
            } else if (timeStr.length() == 8) {
                // "11:00:00" format
                return LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm:ss"));
            } else {
                return LocalTime.parse(timeStr);
            }
        } catch (Exception e) {
            System.err.println("Failed to parse time string: " + timeStr);
            return null;
        }
    }

    // Helper function to compare times ignoring seconds
    private boolean timesMatchIgnoreSeconds(Object t1, Object t2) {
        LocalTime time1 = null;
        LocalTime time2 = null;

        // Convert t1 to LocalTime
        if (t1 instanceof LocalTime) {
            time1 = (LocalTime) t1;
        } else if (t1 instanceof String) {
            time1 = parseTimeString((String) t1);
        }

        // Convert t2 to LocalTime
        if (t2 instanceof LocalTime) {
            time2 = (LocalTime) t2;
        } else if (t2 instanceof String) {
            time2 = parseTimeString((String) t2);
        }

        if (time1 == null || time2 == null) return false;

        // Truncate both times to minutes to ignore seconds
        return time1.truncatedTo(java.time.temporal.ChronoUnit.MINUTES)
                .equals(time2.truncatedTo(java.time.temporal.ChronoUnit.MINUTES));
    }

    // Helper to check if a slot overlaps an appointment (ignoring seconds)
    private boolean isSameSlot(Appointment app, TimeSlot slot) {
        boolean startMatch = timesMatchIgnoreSeconds(app.getStartTime(), slot.getStartTime());
        boolean endMatch = timesMatchIgnoreSeconds(app.getEndTime(), slot.getEndTime());
        
        // Debug logging (remove after testing)
        if (startMatch && endMatch) {
            System.out.println("MATCHED SLOT - Appointment: " + app.getStartTime() + "-" + app.getEndTime() 
                + " | Slot: " + slot.getStartTime() + "-" + slot.getEndTime());
        }
        
        return startMatch && endMatch;
    }

    public List<TimeSlotDto> getAvailableSlotsByClinicAndDate(String speciality, String clinicId, LocalDate bookingDate, List<String> doctorIds) {
        String dayOfWeek = bookingDate.getDayOfWeek().name();
        List<Doctor> doctors = new ArrayList<>();

        // case 1: frontend provided specific doctor ids
        if (doctorIds != null && !doctorIds.isEmpty()) {
            for (String id : doctorIds) {
                if (id == null || id.isBlank()) continue;
                doctorRepository.findByDoctorId(id).ifPresent(doctors::add);
            }
            if (doctors.isEmpty()) return Collections.emptyList();
        } else {
            // case 2: user never select doctor just send Speciality and clinic id
            if (clinicId != null && !clinicId.isBlank()) {
                doctors = doctorRepository.findBySpecialityIgnoreCaseAndClinicId(speciality, clinicId);
            } else {
                doctors = doctorRepository.findBySpecialityIgnoreCase(speciality);
            }

            if (doctors == null || doctors.isEmpty()) {
                return Collections.emptyList();
            }
        }

        List<TimeSlot> allSlots = new ArrayList<>();

        for (Doctor doctor : doctors) {
            List<TimeSlot> doctorSlots = timeSlotRepository.findByDoctorIdAndDayOfWeek(doctor.getDoctorId(), dayOfWeek);
            List<Appointment> bookedAppointments = appointmentRepository.findByDoctorIdAndBookingDate(doctor.getDoctorId(), bookingDate);

            // Debug logging
            System.out.println("Doctor " + doctor.getDoctorId() + " has " + doctorSlots.size() + " slots and " + bookedAppointments.size() + " appointments on " + bookingDate);

            List<TimeSlot> availableSlots = doctorSlots.stream()
                    .filter(slot -> bookedAppointments.stream().noneMatch(app -> isSameSlot(app, slot)))
                    .collect(Collectors.toList());

            allSlots.addAll(availableSlots);
        }

        allSlots.sort(Comparator.comparing(TimeSlot::getDoctorName)
                .thenComparing(slot -> parseTimeString(slot.getStartTime().toString())));

        return allSlots.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<AvailableDateSlotsDto> getAvailableDatesWithSlots(String speciality, String clinicId, List<String> doctorIds) {
        LocalDate today = LocalDate.now();
        LocalDate end = today.plusWeeks(8);
        List<AvailableDateSlotsDto> result = new ArrayList<>();

        List<Doctor> doctors = new ArrayList<>();

        if (doctorIds != null && !doctorIds.isEmpty()) {
            for (String id : doctorIds) {
                if (id == null || id.isBlank()) continue;
                doctorRepository.findByDoctorId(id).ifPresent(doctors::add);
            }
        } else if (clinicId != null && !clinicId.isBlank()) {
            doctors = doctorRepository.findBySpecialityIgnoreCaseAndClinicId(speciality, clinicId);
        } else {
            doctors = doctorRepository.findBySpecialityIgnoreCase(speciality);
        }

        if (doctors.isEmpty()) return Collections.emptyList();

        List<String> doctorIdList = doctors.stream().map(Doctor::getDoctorId).toList();
        List<TimeSlot> allSlots = timeSlotRepository.findByDoctorIdIn(doctorIdList);
        List<Appointment> allAppointments = appointmentRepository.findByDoctorIdInAndBookingDateBetween(
                doctorIdList, today, end);

        Map<String, Map<LocalDate, List<Appointment>>> bookedByDoctorAndDate = allAppointments.stream()
                .collect(Collectors.groupingBy(
                        Appointment::getDoctorId,
                        Collectors.groupingBy(Appointment::getBookingDate)
                ));

        Map<String, Map<String, List<TimeSlot>>> slotsByDoctorAndDay = allSlots.stream()
                .collect(Collectors.groupingBy(
                        TimeSlot::getDoctorId,
                        Collectors.groupingBy(TimeSlot::getDayOfWeek)
                ));

        for (Doctor doctor : doctors) {
            Map<String, List<TimeSlot>> slotsByDay = slotsByDoctorAndDay.getOrDefault(doctor.getDoctorId(), Map.of());
            Map<LocalDate, List<Appointment>> bookedByDate = bookedByDoctorAndDate.getOrDefault(doctor.getDoctorId(), Map.of());

            for (LocalDate date = today; !date.isAfter(end); date = date.plusDays(1)) {
                String dayOfWeek = date.getDayOfWeek().name();
                List<TimeSlot> slotsForDay = slotsByDay.getOrDefault(dayOfWeek, Collections.emptyList());

                if (slotsForDay.isEmpty()) continue;

                List<Appointment> booked = bookedByDate.getOrDefault(date, Collections.emptyList());

                // Debug logging
                System.out.println("Date: " + date + " | Doctor: " + doctor.getDoctorId() + " | Slots: " + slotsForDay.size() + " | Booked: " + booked.size());

                List<TimeSlot> available = slotsForDay.stream()
                        .filter(slot -> {
                            boolean isBooked = booked.stream().anyMatch(app -> isSameSlot(app, slot));
                            if (isBooked) {
                                System.out.println("  -> FILTERED OUT: " + slot.getStartTime() + "-" + slot.getEndTime() + " for " + doctor.getDoctorName());
                            }
                            return !isBooked;
                        })
                        .collect(Collectors.toList());
                
                System.out.println("  -> Available after filtering: " + available.size());

                if (!available.isEmpty()) {
                    List<TimeSlotDto> dtoSlots = available.stream().map(this::toDto).collect(Collectors.toList());
                    AvailableDateSlotsDto entry = new AvailableDateSlotsDto(
                            date,
                            doctor.getDoctorId(),
                            doctor.getDoctorName(),
                            doctor.getClinicId(),
                            doctor.getClinicName(),
                            dtoSlots
                    );
                    result.add(entry);
                }
            }
        }

        return result;
    }

    private TimeSlotDto toDto(TimeSlot slot) {
        if (slot == null) return null;
        boolean available = true;
        return new TimeSlotDto(
                slot.getTimeSlotId(),
                slot.getDoctorId(),
                slot.getDoctorName(),
                slot.getDayOfWeek(),
                slot.getStartTime(),
                slot.getEndTime(),
                available
        );
    }
}