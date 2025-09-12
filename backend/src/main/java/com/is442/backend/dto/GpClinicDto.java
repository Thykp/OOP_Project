package com.is442.backend.dto;

public record GpClinicDto(
        Integer sn,
        String pcn,
        String clinicName,
        String address,
        String telephoneNum
) {}
