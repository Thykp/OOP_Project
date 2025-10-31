package com.is442.backend.controller;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.is442.backend.dto.AvailableDateSlotsDto;
import com.is442.backend.service.TimeSlotService;


@RestController
@RequestMapping("/api/timeslots")
public class TimeSlotController {
    private final TimeSlotService timeSlotService;

    public TimeSlotController(TimeSlotService timeSlotService) {
        this.timeSlotService = timeSlotService;
    }

@GetMapping("/available/dateslots")
public ResponseEntity<List<AvailableDateSlotsDto>> getAvailableDatesWithSlots(
        @RequestParam(required = false) String speciality,
        @RequestParam(required = false) String clinicId,
        @RequestParam(required = false) List<String> doctorId) {

    List<AvailableDateSlotsDto> available = timeSlotService.getAvailableDatesWithSlots(speciality, clinicId, doctorId);
    return ResponseEntity.ok(available);
}

   
    
}
