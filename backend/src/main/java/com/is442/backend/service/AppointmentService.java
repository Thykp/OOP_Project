package com.is442.backend.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.is442.backend.model.Appointment;
import com.is442.backend.repository.AppointmentRepository;

@Service
public class AppointmentService {
    private final AppointmentRepository appointmentRepository;

    public AppointmentService(AppointmentRepository appointmentRepository) {
        this.appointmentRepository = appointmentRepository;
        System.out.println("APPT: " + appointmentRepository);
    }

    public List<Appointment> getAllAppointments() {
        try {
            List<Appointment> apptList = appointmentRepository.findAll();
            System.out.println("APPOINTMENTS LIST: " + apptList);
            return apptList;
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }
    }

}