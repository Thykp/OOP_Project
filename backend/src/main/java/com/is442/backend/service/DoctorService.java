package com.is442.backend.service;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.is442.backend.dto.DoctorDto;
import com.is442.backend.dto.DoctorRequest;
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

    public List<DoctorDto> getDoctorsByClinic(String clinicId) {
        return doctorRepository.findByClinicId(clinicId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public DoctorDto createDoctor(DoctorRequest request) {
        // Check if doctor ID already exists
        Optional<Doctor> existing = doctorRepository.findByDoctorId(request.getDoctorId());
        if (existing.isPresent()) {
            throw new RuntimeException("Doctor with ID " + request.getDoctorId() + " already exists");
        }

        Doctor doctor = new Doctor(
            request.getDoctorId(),
            request.getDoctorName(),
            request.getClinicId(),
            request.getClinicName(),
            request.getClinicAddress() != null ? request.getClinicAddress() : "",
            request.getSpeciality()
        );

        Doctor saved = doctorRepository.save(doctor);
        return toDto(saved);
    }

    @Transactional
    public DoctorDto updateDoctor(String doctorId, DoctorRequest request) {
        Doctor doctor = doctorRepository.findByDoctorId(doctorId)
                .orElseThrow(() -> new RuntimeException("Doctor not found with ID: " + doctorId));

        // Update fields
        doctor.setDoctorName(request.getDoctorName());
        doctor.setClinicId(request.getClinicId());
        doctor.setClinicName(request.getClinicName());
        if (request.getClinicAddress() != null) {
            doctor.setClinicAddress(request.getClinicAddress());
        }
        doctor.setSpeciality(request.getSpeciality());

        // If doctor ID is being changed, check for conflicts
        if (!doctorId.equals(request.getDoctorId())) {
            Optional<Doctor> existing = doctorRepository.findByDoctorId(request.getDoctorId());
            if (existing.isPresent()) {
                throw new RuntimeException("Doctor with ID " + request.getDoctorId() + " already exists");
            }
            doctor.setDoctorId(request.getDoctorId());
        }

        Doctor updated = doctorRepository.save(doctor);
        return toDto(updated);
    }

    @Transactional
    public void deleteDoctor(String doctorId) {
        Doctor doctor = doctorRepository.findByDoctorId(doctorId)
                .orElseThrow(() -> new RuntimeException("Doctor not found with ID: " + doctorId));
        
        doctorRepository.delete(doctor);
    }

    public DoctorDto getDoctorById(String doctorId) {
        Doctor doctor = doctorRepository.findByDoctorId(doctorId)
                .orElseThrow(() -> new RuntimeException("Doctor not found with ID: " + doctorId));
        return toDto(doctor);
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
