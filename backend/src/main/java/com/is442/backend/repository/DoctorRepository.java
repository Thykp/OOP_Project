package com.is442.backend.repository;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.is442.backend.model.Doctor;
import java.util.Optional;



@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long>{
    
  
    List<Doctor> findBySpecialityIgnoreCase(String speciality);
    List<Doctor> findBySpecialityAndClinicId(String speciality, String clinicId);
    List<Doctor> findBySpecialityIgnoreCaseAndClinicId(String speciality, String clinicId);
    Optional<Doctor> findByDoctorIdAndClinicId(String doctorId, String clinicId);
    Optional <Doctor> findByDoctorId(String doctorId);


}
