package com.is442.backend.service;
import java.util.List;

import org.springframework.stereotype.Service;

import com.is442.backend.dto.DoctorDto;
import com.is442.backend.model.Doctor;
import com.is442.backend.repository.DoctorRepository;


@Service
public class DoctorService {

    private final DoctorRepository doctorRepository;

    public DoctorService(DoctorRepository doctorRepository) {
        this.doctorRepository = doctorRepository;
    }

    public List<DoctorDto> getAllDoctors() {
        return doctorRepository.findAll()
                .stream()
                .map(this::toDto)
                .toList();
    }

    private DoctorDto toDto(Doctor doctor) {
        return new DoctorDto(
            doctor.getDoctorId(),
            doctor.getDoctorName(),
            doctor.getClinicId(),
            doctor.getClinicName(),
            doctor.getClinicAddress(),
            doctor.getSpeciality()
        );
    }








    
}
