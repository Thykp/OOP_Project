package com.is442.backend.service;

import java.time.LocalTime;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import com.is442.backend.dto.GpClinicDto;
import com.is442.backend.dto.SpecialistClinicDto;
import com.is442.backend.model.Clinic;
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
            @Nullable KafkaQueueEventProducer queueEventProducer) {
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
        return new GpClinicDto(g.getSn(), g.getClinicId(), g.getPcn(), g.getClinicName(), g.getAddress(),
                g.getTelephoneNum(), g.getOpeningHours(), g.getClosingHours());
    }

    private SpecialistClinicDto toDto(SpecialistClinic s) {
        return new SpecialistClinicDto(
                s.getSn(), s.getIhpClinicId(), s.getRegion(), s.getArea(),
                s.getClinicName(), s.getAddress(), s.getTelephoneNum(), s.getSpeciality(), 
                s.getMonToFriAm(), s.getMonToFriPm(), s.getMonToFriNight(), s.getSatAm(), s.getSatPm(),
                s.getSatNight(),s.getSunAm(),s.getSunPm(),s.getSunNight(),s.getPublicHolidayAm(),s.getPublicHolidayPm(),s.getPublicHolidayNight());
    }

    // update GP operating hours
    public void updateGPClinicOperatingHours(int s_n, GpClinicDto operatinHours) {
        GpClinic clinic = gpRepo.findById(s_n)
                .orElseThrow(() -> new RuntimeException("Clinic not found!"));

        if (operatinHours.getOpeningHours() != null) {
            clinic.setOpeningHours(operatinHours.getOpeningHours());
        }
        if (operatinHours.getClosingHours() != null) {
            clinic.setClosingHours(operatinHours.getClosingHours());
        }

        gpRepo.save(clinic);
    }

    // update Specialist operating hours
    public void updateSpecialistClinicOperatingHours(int s_n, SpecialistClinicDto operatingHours) {
        SpecialistClinic clinic = spRepo.findById(s_n)
                .orElseThrow(() -> new RuntimeException("Clinic not found!"));
       if (operatingHours.getMonToFriAm() != null) {
        clinic.setMonToFriAm(operatingHours.getMonToFriAm());
    }
    if (operatingHours.getMonToFriPm() != null) {
        clinic.setMonToFriPm(operatingHours.getMonToFriPm());
    }
    if (operatingHours.getMonToFriNight() != null) {
        clinic.setMonToFriNight(operatingHours.getMonToFriNight());
    }
    if (operatingHours.getSatAm() != null) {
        clinic.setSatAm(operatingHours.getSatAm());
    }
    if (operatingHours.getSatPm() != null) {
        clinic.setSatPm(operatingHours.getSatPm());
    }
    if (operatingHours.getSatNight() != null) {
        clinic.setSatNight(operatingHours.getSatNight());
    }
    if (operatingHours.getSunAm() != null) {
        clinic.setSunAm(operatingHours.getSunAm());
    }
    if (operatingHours.getSunPm() != null) {
        clinic.setSunPm(operatingHours.getSunPm());
    }
    if (operatingHours.getSunNight() != null) {
        clinic.setSunNight(operatingHours.getSunNight());
    }
    if (operatingHours.getPublicHolidayAm() != null) {
        clinic.setPublicHolidayAm(operatingHours.getPublicHolidayAm());
    }
    if (operatingHours.getPublicHolidayPm() != null) {
        clinic.setPublicHolidayPm(operatingHours.getPublicHolidayPm());
    }
    if (operatingHours.getPublicHolidayNight() != null) {
        clinic.setPublicHolidayNight(operatingHours.getPublicHolidayNight());
    }
        spRepo.save(clinic);
    }

}
