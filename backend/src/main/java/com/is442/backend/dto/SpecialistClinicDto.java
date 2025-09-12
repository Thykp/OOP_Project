package com.is442.backend.dto;

public record SpecialistClinicDto(
        Integer sn,
        String ihpClinicId,
        String region,
        String area,
        String clinicName,
        String address,
        String telephoneNum,
        String speciality
) {}
