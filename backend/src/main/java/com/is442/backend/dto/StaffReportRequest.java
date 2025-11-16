package com.is442.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDate;

public class StaffReportRequest {
    private String clinicId;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate reportDate;

    public StaffReportRequest() {
    }

    public StaffReportRequest(String clinicId, LocalDate reportDate) {
        this.clinicId = clinicId;
        this.reportDate = reportDate;
    }

    public String getClinicId() {
        return clinicId;
    }

    public void setClinicId(String clinicId) {
        this.clinicId = clinicId;
    }

    public LocalDate getReportDate() {
        return reportDate;
    }

    public void setReportDate(LocalDate reportDate) {
        this.reportDate = reportDate;
    }
}

