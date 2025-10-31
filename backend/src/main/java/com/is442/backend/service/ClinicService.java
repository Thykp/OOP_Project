package com.is442.backend.service;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import com.is442.backend.dto.GpClinicDto;
import com.is442.backend.dto.SpecialistClinicDto;
import com.is442.backend.model.GpClinic;
import com.is442.backend.model.SpecialistClinic;
import com.is442.backend.repository.GpClinicRepository;
import com.is442.backend.repository.SpecialistClinicRepository;

@Service
public class ClinicService {

    private final GpClinicRepository gpRepo;
    private final SpecialistClinicRepository spRepo;
    private final KafkaQueueEventProducer queueEventProducer;

    public ClinicService(
            GpClinicRepository gpRepo,
            SpecialistClinicRepository spRepo,
            @Nullable KafkaQueueEventProducer queueEventProducer
    ) {
        this.gpRepo = gpRepo;
        this.spRepo = spRepo;
        this.queueEventProducer = queueEventProducer;
    }

    public List<GpClinicDto> getGpClinics(int limit) {
        return gpRepo.findAll(PageRequest.of(0, limit))
                .stream()
                .map(this::toDto)
                .toList();
    }

    public List<SpecialistClinicDto> getSpecialistClinics(int limit) {
        return spRepo.findAll(PageRequest.of(0, limit))
                .stream()
                .map(this::toDto)
                .toList();
    }

    public void patientCheckIn(String patientId) {
        // TODO: replace with real DB/Redis logic
        int newQueueNumber = 1;

        String message = "Patient " + patientId + " checked in. New queue number is " + newQueueNumber;
        queueEventProducer.sendQueueUpdate(message);
    }

    private GpClinicDto toDto(GpClinic g) {
        return new GpClinicDto(g.getSn(), g.getClinicId(), g.getPcn(), g.getClinicName(), g.getAddress(), g.getTelephoneNum());
    }

    private SpecialistClinicDto toDto(SpecialistClinic s) {
        return new SpecialistClinicDto(
                s.getSn(), s.getIhpClinicId(), s.getRegion(), s.getArea(),
                s.getClinicName(), s.getAddress(), s.getTelephoneNum(), s.getSpeciality()
        );
    }
}
