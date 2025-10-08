package com.is442.backend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;


import com.is442.backend.dto.GpClinicDto;
import com.is442.backend.dto.SpecialistClinicDto;
import com.is442.backend.model.GpClinic;
import com.is442.backend.model.SpecialistClinic;
@Service
public class ClinicService {

    @Autowired
    private KafkaQueueEventProducer queueEventProducer;

    // other dependencies (e.g., repository, redis service)

    public void patientCheckIn(String patientId) {
        // 1. Update the patient's status in the database.
        // patientRepository.updateStatus(patientId, "checked_in");

        // 2. Update the queue number in Redis for fast access.
        // int newQueueNumber = redisService.incrementQueue();
        int newQueueNumber = 1;

        // 3. Publish an event to Kafka.
        // This is a key part of your business logic.
        String message = "Patient " + patientId + " checked in. New queue number is " + newQueueNumber;
        queueEventProducer.sendQueueUpdate(message);
    }

    private GpClinicDto toDto(GpClinic g) {
        return new GpClinicDto(g.getSn(), g.getPcn(), g.getClinicName(), g.getAddress(), g.getTelephoneNum());
    }

    private SpecialistClinicDto toDto(SpecialistClinic s) {
        return new SpecialistClinicDto(
                s.getSn(), s.getIhpClinicId(), s.getRegion(), s.getArea(),
                s.getClinicName(), s.getAddress(), s.getTelephoneNum(), s.getSpeciality()
        );
    }
}
