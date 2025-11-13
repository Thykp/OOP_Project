package com.is442.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@Service
public class SupabaseStorageService {

    private static final Logger logger = LoggerFactory.getLogger(SupabaseStorageService.class);
    private static final String BUCKET_NAME = "clinic_report";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Value("${supabase.url}")
    private String supabaseUrl;

    @Value("${supabase.key}")
    private String supabaseKey;

    private WebClient webClient;
    private final WebClient.Builder webClientBuilder;

    public SupabaseStorageService(WebClient.Builder webClientBuilder) {
        this.webClientBuilder = webClientBuilder;
    }

    @jakarta.annotation.PostConstruct
    private void initWebClient() {
        if (supabaseUrl == null || supabaseKey == null) {
            logger.error("Supabase URL or Key is null. URL: {}, Key: {}", supabaseUrl, supabaseKey != null ? "***" : null);
            throw new IllegalStateException("Supabase configuration is missing");
        }
        this.webClient = webClientBuilder
                .baseUrl(supabaseUrl + "/storage/v1")
                .defaultHeader("apikey", supabaseKey)
                .defaultHeader("Authorization", "Bearer " + supabaseKey)
                .build();
    }

    /**
     * Upload a PDF file to Supabase storage bucket
     * 
     * @param pdfBytes PDF file content as byte array
     * @param clinicId Clinic ID for path organization
     * @param reportDate Report date for path organization
     * @return File path in the bucket (e.g., "reports/{clinicId}/{date}/report_{timestamp}.pdf")
     * @throws RuntimeException if upload fails
     */
    public String uploadPdf(byte[] pdfBytes, String clinicId, LocalDate reportDate) {
        if (webClient == null) {
            throw new IllegalStateException("WebClient not initialized. Supabase configuration may be missing.");
        }
        if (pdfBytes == null || pdfBytes.length == 0) {
            throw new IllegalArgumentException("PDF bytes cannot be null or empty");
        }
        if (clinicId == null || clinicId.isBlank()) {
            throw new IllegalArgumentException("Clinic ID cannot be null or blank");
        }
        if (reportDate == null) {
            throw new IllegalArgumentException("Report date cannot be null");
        }
        
        try {
            // Generate file path: reports/{clinicId}/{YYYY-MM-DD}/report_{timestamp}.pdf
            String dateStr = reportDate.format(DATE_FORMATTER);
            long timestamp = System.currentTimeMillis();
            String fileName = "report_" + timestamp + ".pdf";
            String filePath = String.format("reports/%s/%s/%s", clinicId, dateStr, fileName);

            logger.info("Uploading PDF to Supabase storage: {}", filePath);

            // Upload file to Supabase storage
            ByteArrayResource resource = new ByteArrayResource(pdfBytes) {
                @Override
                public String getFilename() {
                    return fileName;
                }
            };

            String uploadUrl = String.format("/object/%s/%s", BUCKET_NAME, filePath);
            
            webClient.post()
                    .uri(uploadUrl)
                    .contentType(MediaType.APPLICATION_PDF)
                    .header("Content-Type", "application/pdf")
                    .bodyValue(resource)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            logger.info("PDF uploaded successfully to: {}", filePath);
            return filePath;

        } catch (Exception e) {
            logger.error("Failed to upload PDF to Supabase storage", e);
            throw new RuntimeException("Failed to upload PDF to storage: " + e.getMessage(), e);
        }
    }

    /**
     * Download a PDF file from Supabase storage bucket
     * 
     * @param filePath File path in the bucket
     * @return PDF file content as byte array
     * @throws RuntimeException if download fails
     */
    public byte[] downloadPdf(String filePath) {
        try {
            logger.info("Downloading PDF from Supabase storage: {}", filePath);

            String downloadUrl = String.format("/object/%s/%s", BUCKET_NAME, filePath);

            byte[] pdfBytes = webClient.get()
                    .uri(downloadUrl)
                    .retrieve()
                    .bodyToMono(byte[].class)
                    .block();

            logger.info("PDF downloaded successfully from: {}", filePath);
            return pdfBytes;

        } catch (Exception e) {
            logger.error("Failed to download PDF from Supabase storage: {}", filePath, e);
            throw new RuntimeException("Failed to download PDF from storage: " + e.getMessage(), e);
        }
    }

    /**
     * Delete a PDF file from Supabase storage bucket
     * 
     * @param filePath File path in the bucket
     * @throws RuntimeException if deletion fails
     */
    public void deletePdf(String filePath) {
        if (webClient == null) {
            throw new IllegalStateException("WebClient not initialized. Supabase configuration may be missing.");
        }
        if (filePath == null || filePath.isBlank()) {
            throw new IllegalArgumentException("File path cannot be null or blank");
        }

        try {
            logger.info("Deleting PDF from Supabase storage: {}", filePath);

            String deleteUrl = String.format("/object/%s/%s", BUCKET_NAME, filePath);

            webClient.delete()
                    .uri(deleteUrl)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            logger.info("PDF deleted successfully from: {}", filePath);

        } catch (Exception e) {
            logger.error("Failed to delete PDF from Supabase storage: {}", filePath, e);
            throw new RuntimeException("Failed to delete PDF from storage: " + e.getMessage(), e);
        }
    }
}

