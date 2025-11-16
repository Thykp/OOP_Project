package com.is442.backend.service;

import com.is442.backend.dto.StaffReportResponse;
import com.is442.backend.model.Appointment;
import com.is442.backend.model.Doctor;
import com.is442.backend.model.StaffReport;
import com.is442.backend.model.User;
import com.is442.backend.repository.AppointmentRepository;
import com.is442.backend.repository.DoctorRepository;
import com.is442.backend.repository.StaffReportRepository;
import com.is442.backend.repository.UserRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.graphics.color.PDColor;
import org.apache.pdfbox.pdmodel.graphics.color.PDDeviceRGB;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Service
@Transactional
public class StaffReportService {

    private static final Logger logger = LoggerFactory.getLogger(StaffReportService.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Autowired
    private StaffReportRepository staffReportRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private DoctorRepository doctorRepository;

    @Autowired
    private SupabaseStorageService supabaseStorageService;

    @Autowired(required = false)
    private UserRepository userRepository;

    /**
     * Generate a daily report for a clinic on a specific date
     */
    public StaffReportResponse generateDailyReport(String clinicId, LocalDate date, String generatedBy) {
        logger.info("Generating daily report for clinic {} on date {}", clinicId, date);

        // Check if report already exists
        Optional<StaffReport> existingReport = staffReportRepository.findByClinicIdAndReportDate(clinicId, date);
        if (existingReport.isPresent()) {
            logger.info("Report already exists for clinic {} on date {}, returning existing report", clinicId, date);
            return toResponse(existingReport.get());
        }

        // Query appointments for the date and clinic
        List<Appointment> appointments = appointmentRepository.findByClinicId(clinicId);
        List<Appointment> dayAppointments = appointments.stream()
                .filter(a -> a.getBookingDate().equals(date))
                .toList();

        // Calculate metrics
        int patientsSeen = (int) dayAppointments.stream()
                .filter(a -> "COMPLETED".equals(a.getStatus()))
                .count();

        // Calculate average waiting time
        BigDecimal averageWaitingTimeMinutes = calculateAverageWaitingTime(dayAppointments);

        // Calculate no-show rate
        int totalScheduled = dayAppointments.size();
        int noShowCount = (int) dayAppointments.stream()
                .filter(a -> "NO_SHOW".equals(a.getStatus()))
                .count();
        BigDecimal noShowRate = totalScheduled > 0
                ? BigDecimal.valueOf(noShowCount * 100.0 / totalScheduled)
                .setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        // Generate PDF
        byte[] pdfBytes;
        try {
            pdfBytes = generatePdf(clinicId, date, patientsSeen, averageWaitingTimeMinutes, noShowRate, generatedBy);
            if (pdfBytes == null || pdfBytes.length == 0) {
                throw new RuntimeException("PDF generation returned empty bytes");
            }
        } catch (Exception e) {
            logger.error("Failed to generate PDF for clinic {} on date {}", clinicId, date, e);
            throw new RuntimeException("Failed to generate PDF: " + e.getMessage(), e);
        }

        // Upload PDF to Supabase storage
        String pdfFilePath;
        try {
            pdfFilePath = supabaseStorageService.uploadPdf(pdfBytes, clinicId, date);
            if (pdfFilePath == null || pdfFilePath.isBlank()) {
                throw new RuntimeException("PDF upload returned empty file path");
            }
        } catch (Exception e) {
            logger.error("Failed to upload PDF to storage for clinic {} on date {}", clinicId, date, e);
            throw new RuntimeException("Failed to upload PDF to storage: " + e.getMessage(), e);
        }

        // Save report to database
        StaffReport report = new StaffReport();
        report.setClinicId(clinicId);
        report.setReportDate(date);
        report.setPatientsSeen(patientsSeen);
        report.setAverageWaitingTimeMinutes(averageWaitingTimeMinutes);
        report.setNoShowRate(noShowRate);
        report.setTotalAppointments(totalScheduled);
        report.setNoShowCount(noShowCount);
        report.setPdfFilePath(pdfFilePath);
        report.setGeneratedBy(generatedBy);

        StaffReport saved = staffReportRepository.save(report);
        logger.info("Report saved with ID: {}", saved.getId());

        return toResponse(saved);
    }

    /**
     * Calculate average waiting time for completed appointments
     * Waiting time = updated_at (when COMPLETED) - (booking_date + start_time)
     */
    private BigDecimal calculateAverageWaitingTime(List<Appointment> appointments) {
        List<Appointment> completed = appointments.stream()
                .filter(a -> "COMPLETED".equals(a.getStatus()))
                .filter(a -> a.getUpdatedAt() != null)
                .toList();

        if (completed.isEmpty()) {
            return BigDecimal.ZERO;
        }

        long totalMinutes = 0;
        int count = 0;

        for (Appointment appt : completed) {
            try {
                LocalDateTime appointmentStart = LocalDateTime.of(appt.getBookingDate(), appt.getStartTime());
                LocalDateTime completedAt = appt.getUpdatedAt();

                Duration duration = Duration.between(appointmentStart, completedAt);
                long minutes = duration.toMinutes();

                if (minutes >= 0) { // Only count positive waiting times
                    totalMinutes += minutes;
                    count++;
                }
            } catch (Exception e) {
                logger.warn("Error calculating waiting time for appointment {}: {}", appt.getAppointmentId(), e.getMessage());
            }
        }

        if (count == 0) {
            return BigDecimal.ZERO;
        }

        return BigDecimal.valueOf(totalMinutes)
                .divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
    }

    /**
     * Generate PDF report with colors and charts
     */
    private byte[] generatePdf(String clinicId, LocalDate date, int patientsSeen,
                               BigDecimal averageWaitingTime, BigDecimal noShowRate, String generatedBy) {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            try (PDPageContentStream contentStream = new PDPageContentStream(document, page)) {
                float margin = 50;
                float pageWidth = PDRectangle.A4.getWidth();
                float pageHeight = PDRectangle.A4.getHeight();
                float yPosition = pageHeight - margin;
                float lineHeight = 20;
                float titleFontSize = 24;
                float bodyFontSize = 12;
                float largeFontSize = 16;

                // Color definitions
                PDColor headerColor = new PDColor(new float[]{0.2f, 0.4f, 0.8f}, PDDeviceRGB.INSTANCE); // Blue
                PDColor greenColor = new PDColor(new float[]{0.2f, 0.7f, 0.3f}, PDDeviceRGB.INSTANCE); // Green
                PDColor orangeColor = new PDColor(new float[]{1.0f, 0.6f, 0.2f}, PDDeviceRGB.INSTANCE); // Orange
                PDColor redColor = new PDColor(new float[]{0.9f, 0.3f, 0.3f}, PDDeviceRGB.INSTANCE); // Red
                PDColor lightGray = new PDColor(new float[]{0.95f, 0.95f, 0.95f}, PDDeviceRGB.INSTANCE);
                PDColor darkGray = new PDColor(new float[]{0.3f, 0.3f, 0.3f}, PDDeviceRGB.INSTANCE);

                // Colored Header Box
                float headerHeight = 80;
                contentStream.setNonStrokingColor(headerColor);
                contentStream.addRect(margin, yPosition - headerHeight, pageWidth - 2 * margin, headerHeight);
                contentStream.fill();

                // Title in header
                contentStream.beginText();
                contentStream.setNonStrokingColor(1, 1, 1); // White text
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), titleFontSize);
                contentStream.newLineAtOffset(margin + 10, yPosition - 40);
                contentStream.showText("Daily Clinic Report");
                contentStream.endText();

                yPosition -= headerHeight + 30;

                // Clinic and Date Info
                contentStream.beginText();
                contentStream.setNonStrokingColor(darkGray);
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), bodyFontSize);
                contentStream.newLineAtOffset(margin, yPosition);

                // Get clinic name if available
                Optional<Doctor> doctorOpt = doctorRepository.findByClinicId(clinicId).stream().findFirst();
                String clinicName = doctorOpt.map(Doctor::getClinicName)
                        .filter(name -> name != null && !name.isBlank())
                        .orElse(clinicId != null ? clinicId : "Unknown Clinic");

                contentStream.showText("Clinic: " + (clinicName != null ? clinicName : "Unknown Clinic"));
                contentStream.endText();

                yPosition -= lineHeight;

                contentStream.beginText();
                contentStream.setNonStrokingColor(darkGray);
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), bodyFontSize);
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText("Report Date: " + date.format(DATE_FORMATTER));
                contentStream.endText();

                yPosition -= lineHeight * 2;

                // Metrics Cards Section
                float cardWidth = (pageWidth - 2 * margin - 20) / 3; // 3 cards with spacing
                float cardHeight = 120;
                float cardY = yPosition - cardHeight;

                // Card 1: Patients Seen (Green)
                drawMetricCard(contentStream, margin, cardY, cardWidth, cardHeight, greenColor,
                        "Patients Seen", String.valueOf(patientsSeen), patientsSeen, 50, bodyFontSize, largeFontSize);

                // Card 2: Average Waiting Time (Orange)
                String waitingTimeStr;
                double waitingMinutes = 0;
                if (averageWaitingTime == null) {
                    waitingTimeStr = "N/A";
                } else {
                    waitingMinutes = averageWaitingTime.doubleValue();
                    if (waitingMinutes == 0 && patientsSeen == 0) {
                        waitingTimeStr = "N/A";
                    } else {
                        waitingTimeStr = String.format("%.1f min", waitingMinutes);
                    }
                }
                drawMetricCard(contentStream, margin + cardWidth + 10, cardY, cardWidth, cardHeight, orangeColor,
                        "Avg Waiting Time", waitingTimeStr, (int) Math.min(waitingMinutes, 60), 60, bodyFontSize, largeFontSize);

                // Card 3: No-Show Rate (Red)
                double noShowValue = noShowRate != null ? noShowRate.doubleValue() : 0;
                String noShowRateStr = String.format("%.1f%%", noShowValue);
                drawMetricCard(contentStream, margin + 2 * (cardWidth + 10), cardY, cardWidth, cardHeight, redColor,
                        "No-Show Rate", noShowRateStr, (int) noShowValue, 100, bodyFontSize, largeFontSize);

                yPosition = cardY - 40;

                // Additional Details Section
                contentStream.beginText();
                contentStream.setNonStrokingColor(darkGray);
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), bodyFontSize);
                contentStream.newLineAtOffset(margin, yPosition);
                contentStream.showText("Report Details");
                contentStream.endText();

                yPosition -= lineHeight * 1.5f;

                // Light gray background for details
                float detailsHeight = 60;
                contentStream.setNonStrokingColor(lightGray);
                contentStream.addRect(margin, yPosition - detailsHeight, pageWidth - 2 * margin, detailsHeight);
                contentStream.fill();

                // Get generated by name if available
                String generatedByName = "Staff";
                if (userRepository != null && generatedBy != null && !generatedBy.isBlank()) {
                    try {
                        Optional<User> userOpt = userRepository.findById(java.util.UUID.fromString(generatedBy));
                        if (userOpt.isPresent()) {
                            User user = userOpt.get();
                            String firstName = user.getFirstName() != null ? user.getFirstName() : "";
                            String lastName = user.getLastName() != null ? user.getLastName() : "";
                            String fullName = (firstName + " " + lastName).trim();
                            if (!fullName.isBlank()) {
                                generatedByName = fullName;
                            }
                        }
                    } catch (Exception e) {
                        logger.warn("Could not fetch user name for generatedBy: {}", generatedBy, e);
                    }
                }

                float detailsY = yPosition - 15;
                contentStream.beginText();
                contentStream.setNonStrokingColor(darkGray);
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                contentStream.newLineAtOffset(margin + 10, detailsY);
                // Format in Singapore timezone (GMT+8)
                java.time.OffsetDateTime singaporeTime = java.time.OffsetDateTime.now(java.time.ZoneOffset.of("+08:00"));
                contentStream.showText("Generated: " + singaporeTime.format(DATETIME_FORMATTER));
                contentStream.endText();

                detailsY -= lineHeight;
                contentStream.beginText();
                contentStream.setNonStrokingColor(darkGray);
                contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 10);
                contentStream.newLineAtOffset(margin + 10, detailsY);
                contentStream.showText("Generated by: " + (generatedByName != null ? generatedByName : "Staff"));
                contentStream.endText();
            }

            // Save to byte array
            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            document.save(outputStream);
            return outputStream.toByteArray();

        } catch (IOException e) {
            logger.error("Error generating PDF", e);
            throw new RuntimeException("Failed to generate PDF: " + e.getMessage(), e);
        }
    }

    /**
     * Draw a metric card with color, label, value, and a simple bar chart
     */
    private void drawMetricCard(PDPageContentStream contentStream, float x, float y, float width, float height,
                                PDColor cardColor, String label, String value, int barValue, int maxValue,
                                float labelFontSize, float valueFontSize) throws IOException {
        // Card background
        PDColor lightCardColor = new PDColor(
                new float[]{
                        Math.min(1.0f, cardColor.getComponents()[0] + 0.3f),
                        Math.min(1.0f, cardColor.getComponents()[1] + 0.3f),
                        Math.min(1.0f, cardColor.getComponents()[2] + 0.3f)
                },
                PDDeviceRGB.INSTANCE
        );
        contentStream.setNonStrokingColor(lightCardColor);
        contentStream.addRect(x, y, width, height);
        contentStream.fill();

        // Card border
        contentStream.setStrokingColor(cardColor);
        contentStream.setLineWidth(2);
        contentStream.addRect(x, y, width, height);
        contentStream.stroke();

        // Label
        contentStream.beginText();
        contentStream.setNonStrokingColor(0.3f, 0.3f, 0.3f);
        contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), labelFontSize);
        contentStream.newLineAtOffset(x + 10, y + height - 25);
        contentStream.showText(label);
        contentStream.endText();

        // Value (large)
        contentStream.beginText();
        contentStream.setNonStrokingColor(cardColor);
        contentStream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD), valueFontSize);
        contentStream.newLineAtOffset(x + 10, y + height - 50);
        contentStream.showText(value);
        contentStream.endText();

        // Simple bar chart
        float barX = x + 10;
        float barY = y + 20;
        float barWidth = width - 20;
        float barHeight = 15;
        float maxBarWidth = barWidth;

        // Background bar (light gray)
        contentStream.setNonStrokingColor(0.9f, 0.9f, 0.9f);
        contentStream.addRect(barX, barY, maxBarWidth, barHeight);
        contentStream.fill();

        // Filled bar (colored)
        if (maxValue > 0) {
            float filledWidth = (barValue / (float) maxValue) * maxBarWidth;
            filledWidth = Math.min(filledWidth, maxBarWidth); // Cap at max
            contentStream.setNonStrokingColor(cardColor);
            contentStream.addRect(barX, barY, filledWidth, barHeight);
            contentStream.fill();
        }

        // Bar border
        contentStream.setStrokingColor(0.7f, 0.7f, 0.7f);
        contentStream.setLineWidth(0.5f);
        contentStream.addRect(barX, barY, maxBarWidth, barHeight);
        contentStream.stroke();
    }

    /**
     * Get report by date for a clinic
     */
    public StaffReportResponse getReportByDate(String clinicId, LocalDate date) {
        Optional<StaffReport> report = staffReportRepository.findByClinicIdAndReportDate(clinicId, date);
        return report.map(this::toResponse)
                .orElseThrow(() -> new RuntimeException("Report not found for clinic " + clinicId + " on date " + date));
    }

    /**
     * Get all past reports for a clinic
     */
    public List<StaffReportResponse> getPastReports(String clinicId) {
        List<StaffReport> reports = staffReportRepository.findByClinicIdOrderByReportDateDesc(clinicId);
        return reports.stream()
                .map(this::toResponse)
                .toList();
    }

    /**
     * Download PDF for a report
     */
    public byte[] downloadReportPdf(Long reportId) {
        StaffReport report = staffReportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        if (report.getPdfFilePath() == null || report.getPdfFilePath().isBlank()) {
            throw new RuntimeException("PDF file path not found for report ID: " + reportId);
        }

        return supabaseStorageService.downloadPdf(report.getPdfFilePath());
    }

    /**
     * Delete a report and its PDF file
     */
    @Transactional
    public void deleteReport(Long reportId, String clinicId) {
        StaffReport report = staffReportRepository.findById(reportId)
                .orElseThrow(() -> new RuntimeException("Report not found with ID: " + reportId));

        // Verify the report belongs to the clinic
        if (!report.getClinicId().equals(clinicId)) {
            throw new RuntimeException("Report does not belong to the specified clinic");
        }

        // Delete PDF from Supabase storage if it exists
        if (report.getPdfFilePath() != null && !report.getPdfFilePath().isBlank()) {
            try {
                supabaseStorageService.deletePdf(report.getPdfFilePath());
            } catch (Exception e) {
                logger.warn("Failed to delete PDF file from storage: {}", report.getPdfFilePath(), e);
                // Continue with database deletion even if file deletion fails
            }
        }

        // Delete from database
        staffReportRepository.deleteById(reportId);
        logger.info("Report {} deleted successfully", reportId);
    }

    /**
     * Convert StaffReport entity to StaffReportResponse DTO
     */
    private StaffReportResponse toResponse(StaffReport report) {
        StaffReportResponse response = new StaffReportResponse();
        response.setId(report.getId());
        response.setClinicId(report.getClinicId());
        response.setReportDate(report.getReportDate());
        response.setPatientsSeen(report.getPatientsSeen());
        response.setAverageWaitingTimeMinutes(report.getAverageWaitingTimeMinutes());
        response.setNoShowRate(report.getNoShowRate());
        response.setTotalAppointments(report.getTotalAppointments());
        response.setNoShowCount(report.getNoShowCount());
        response.setPdfFilePath(report.getPdfFilePath());
        response.setGeneratedAt(report.getGeneratedAt());
        response.setGeneratedBy(report.getGeneratedBy());

        // Get clinic name
        Optional<Doctor> doctorOpt = doctorRepository.findByClinicId(report.getClinicId()).stream().findFirst();
        response.setClinicName(doctorOpt.map(Doctor::getClinicName).orElse(report.getClinicId()));

        // Get generated by name
        if (userRepository != null) {
            try {
                Optional<User> userOpt = userRepository.findById(java.util.UUID.fromString(report.getGeneratedBy()));
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    response.setGeneratedByName(user.getFirstName() + " " + user.getLastName());
                }
            } catch (Exception e) {
                logger.warn("Could not fetch user name for generatedBy: {}", report.getGeneratedBy());
            }
        }

        return response;
    }
}

