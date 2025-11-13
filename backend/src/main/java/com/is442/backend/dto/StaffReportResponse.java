package com.is442.backend.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public class StaffReportResponse {
    private Long id;
    
    @JsonProperty("clinic_id")
    private String clinicId;
    
    @JsonProperty("clinic_name")
    private String clinicName;
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    @JsonProperty("report_date")
    private LocalDate reportDate;
    
    @JsonProperty("patients_seen")
    private Integer patientsSeen;
    
    @JsonProperty("average_waiting_time_minutes")
    private BigDecimal averageWaitingTimeMinutes;
    
    @JsonProperty("no_show_rate")
    private BigDecimal noShowRate;
    
    @JsonProperty("total_appointments")
    private Integer totalAppointments;
    
    @JsonProperty("no_show_count")
    private Integer noShowCount;
    
    @JsonProperty("pdf_file_path")
    private String pdfFilePath;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ssXXX")
    @JsonProperty("generated_at")
    private OffsetDateTime generatedAt;
    
    @JsonProperty("generated_by")
    private String generatedBy;
    
    @JsonProperty("generated_by_name")
    private String generatedByName;
    
    public StaffReportResponse() {
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getClinicId() {
        return clinicId;
    }
    
    public void setClinicId(String clinicId) {
        this.clinicId = clinicId;
    }
    
    public String getClinicName() {
        return clinicName;
    }
    
    public void setClinicName(String clinicName) {
        this.clinicName = clinicName;
    }
    
    public LocalDate getReportDate() {
        return reportDate;
    }
    
    public void setReportDate(LocalDate reportDate) {
        this.reportDate = reportDate;
    }
    
    public Integer getPatientsSeen() {
        return patientsSeen;
    }
    
    public void setPatientsSeen(Integer patientsSeen) {
        this.patientsSeen = patientsSeen;
    }
    
    public BigDecimal getAverageWaitingTimeMinutes() {
        return averageWaitingTimeMinutes;
    }
    
    public void setAverageWaitingTimeMinutes(BigDecimal averageWaitingTimeMinutes) {
        this.averageWaitingTimeMinutes = averageWaitingTimeMinutes;
    }
    
    public BigDecimal getNoShowRate() {
        return noShowRate;
    }
    
    public void setNoShowRate(BigDecimal noShowRate) {
        this.noShowRate = noShowRate;
    }
    
    public Integer getTotalAppointments() {
        return totalAppointments;
    }
    
    public void setTotalAppointments(Integer totalAppointments) {
        this.totalAppointments = totalAppointments;
    }
    
    public Integer getNoShowCount() {
        return noShowCount;
    }
    
    public void setNoShowCount(Integer noShowCount) {
        this.noShowCount = noShowCount;
    }
    
    public String getPdfFilePath() {
        return pdfFilePath;
    }
    
    public void setPdfFilePath(String pdfFilePath) {
        this.pdfFilePath = pdfFilePath;
    }
    
    public OffsetDateTime getGeneratedAt() {
        return generatedAt;
    }
    
    public void setGeneratedAt(OffsetDateTime generatedAt) {
        this.generatedAt = generatedAt;
    }
    
    public String getGeneratedBy() {
        return generatedBy;
    }
    
    public void setGeneratedBy(String generatedBy) {
        this.generatedBy = generatedBy;
    }
    
    public String getGeneratedByName() {
        return generatedByName;
    }
    
    public void setGeneratedByName(String generatedByName) {
        this.generatedByName = generatedByName;
    }
}

