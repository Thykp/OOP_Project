package com.is442.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "staff_reports")
public class StaffReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "clinic_id", nullable = false)
    @JsonProperty("clinic_id")
    private String clinicId;

    @Column(name = "report_date", nullable = false)
    @JsonProperty("report_date")
    private LocalDate reportDate;

    @Column(name = "patients_seen", nullable = false)
    @JsonProperty("patients_seen")
    private Integer patientsSeen = 0;

    @Column(name = "average_waiting_time_minutes")
    @JsonProperty("average_waiting_time_minutes")
    private BigDecimal averageWaitingTimeMinutes;

    @Column(name = "no_show_rate")
    @JsonProperty("no_show_rate")
    private BigDecimal noShowRate;

    @Column(name = "total_appointments", nullable = false)
    @JsonProperty("total_appointments")
    private Integer totalAppointments = 0;

    @Column(name = "no_show_count", nullable = false)
    @JsonProperty("no_show_count")
    private Integer noShowCount = 0;

    @Column(name = "pdf_file_path")
    @JsonProperty("pdf_file_path")
    private String pdfFilePath;

    @Column(name = "generated_at", nullable = false, updatable = false)
    @JsonProperty("generated_at")
    private OffsetDateTime generatedAt;

    @Column(name = "generated_by", nullable = false)
    @JsonProperty("generated_by")
    private String generatedBy;

    public StaffReport() {
    }

    public StaffReport(String clinicId, LocalDate reportDate, Integer patientsSeen,
                      BigDecimal averageWaitingTimeMinutes, BigDecimal noShowRate,
                      Integer totalAppointments, Integer noShowCount, String pdfFilePath,
                      String generatedBy) {
        this.clinicId = clinicId;
        this.reportDate = reportDate;
        this.patientsSeen = patientsSeen;
        this.averageWaitingTimeMinutes = averageWaitingTimeMinutes;
        this.noShowRate = noShowRate;
        this.totalAppointments = totalAppointments;
        this.noShowCount = noShowCount;
        this.pdfFilePath = pdfFilePath;
        this.generatedBy = generatedBy;
    }

    @PrePersist
    protected void onCreate() {
        // Store in Singapore timezone (GMT+8)
        generatedAt = OffsetDateTime.now(ZoneOffset.of("+08:00"));
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
}

