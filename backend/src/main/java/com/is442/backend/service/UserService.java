package com.is442.backend.service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.is442.backend.dto.PatientRequest;
import com.is442.backend.dto.PatientResponse;
import com.is442.backend.dto.StaffRequest;
import com.is442.backend.dto.StaffResponse;
import com.is442.backend.model.ClinicStaff;
import com.is442.backend.model.Patient;
import com.is442.backend.model.User;
import com.is442.backend.repository.PatientRepository;
import com.is442.backend.repository.UserRepository;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PatientRepository patientRepository;

    public <T extends User> T registerUser(T user) {
        return userRepository.save(user);
    }

    public User findBySupabaseUserId(UUID supabaseUserId) {
        return userRepository.findBySupabaseUserId(supabaseUserId)
                .orElseThrow(() -> new RuntimeException("User not found with Supabase ID: " + supabaseUserId));
    }

    // Find patient by email (returns PatientResponse or throws if not a patient)
    @Transactional(readOnly = true)
    public PatientResponse findPatientByEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new RuntimeException("Email is required");
        }
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Patient not found with email: " + email));
        if (!(user instanceof Patient)) {
            throw new RuntimeException("User with email does not have patient role");
        }
        return new PatientResponse((Patient) user);
    }
    

    // Get All Patients
    @Transactional(readOnly = true)
    public List<PatientResponse> getAllPatients() {
        return userRepository.findAll().stream()
                .filter(u -> u instanceof Patient) // only Patient objects
                .map(u -> new PatientResponse((Patient) u)) // convert to PatientResponse
                .collect(Collectors.toList()); // collect to List<PatientResponse>
    }

    // Get All Staff
    @Transactional(readOnly = true)
    public List<StaffResponse> getAllClinicStaff() {
        return userRepository.findAll().stream()
                .filter(u -> u instanceof ClinicStaff)
                .map(u -> new StaffResponse((ClinicStaff) u))
                .collect(Collectors.toList());
    }

    // Search patients by partial email (case-insensitive)
    @Transactional(readOnly = true)
    public List<PatientResponse> searchPatientsByEmail(String emailPart) {
        if (emailPart == null || emailPart.trim().isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return patientRepository.findByEmailContainingIgnoreCase(emailPart.trim()).stream()
                .map(PatientResponse::new)
                .collect(Collectors.toList());
    }

    // Update Patient Details
    public PatientResponse updatePatient(UUID id, PatientRequest patientRequest) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found!"));

        if (!(user instanceof Patient)) {
            throw new RuntimeException("User is not a patient!");
        }
        Patient patient = (Patient) user;

        if (patientRequest.getEmail() != null) {
            patient.setEmail(patientRequest.getEmail());
        }

        if (patientRequest.getFirstName() != null) {
            patient.setFirstName(patientRequest.getFirstName());
        }

        if (patientRequest.getLastName() != null) {
            patient.setLastName(patientRequest.getLastName());
        }

        // Fields for Patients only
        if (patientRequest.getPhone() != null) {
            patient.setPhone(patientRequest.getPhone());
        }

        if (patientRequest.getDateOfBirth() != null) {
            patient.setDateOfBirth(patientRequest.getDateOfBirth());
        }

        if (patientRequest.getGender() != null) {
            patient.setGender(patientRequest.getGender());
        }

        Patient updatedPatient = userRepository.save(patient);
        return new PatientResponse(updatedPatient);
    }

    // Update Staff Details
    public StaffResponse updateStaff(UUID id, StaffRequest staffRequest) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found!"));

        if (!(user instanceof ClinicStaff)) {
            throw new RuntimeException("User is not a patient!");
        }
        ClinicStaff staff = (ClinicStaff) user;

        if (staffRequest.getEmail() != null) {
            staff.setEmail(staffRequest.getEmail());
        }

        if (staffRequest.getFirstName() != null) {
            staff.setFirstName(staffRequest.getFirstName());
        }

        if (staffRequest.getLastName() != null) {
            staff.setLastName(staffRequest.getLastName());
        }

        // Field for Staff only
        if (staffRequest.getClinicName() != null) {
            staff.setClinicName(staffRequest.getClinicName());
        }

        if (staffRequest.getPosition() != null) {
            staff.setPosition(staffRequest.getPosition());
        }

        ClinicStaff updatedStaff = userRepository.save(staff);
        return new StaffResponse(updatedStaff);
    }

    // Delete User
    public void deleteUser(UUID id) {
        userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found!"));

        userRepository.deleteById(id);
    }

}
