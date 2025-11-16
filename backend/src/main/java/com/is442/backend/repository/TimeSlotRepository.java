package com.is442.backend.repository;

import com.is442.backend.model.TimeSlot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;


@Repository
public interface TimeSlotRepository extends JpaRepository<TimeSlot, Long> {
    List<TimeSlot> findByDoctorId(String doctorId);

    List<TimeSlot> findByDoctorIdAndDayOfWeek(String doctorId, String dayOfWeek);

    List<TimeSlot> findByDayOfWeek(String dayOfWeek);

    List<TimeSlot> findByDoctorIdIn(List<String> doctorIds);


}
