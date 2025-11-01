package com.is442.backend.config;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.is442.backend.model.Doctor;

@Component
@ConditionalOnProperty(name = "app.runDoctorSeeder", havingValue = "true")

public class DoctorSeeder implements CommandLineRunner {

    private final WebClient supabaseClient;
    private final ObjectMapper om = new ObjectMapper();

    @Value("${seeder.enabled:true}")
    private boolean seederEnabled;

    private static final int NUM_DOCTORS = 3;
    private static final int SLOT_MINUTES = 60;
    private int doctorCounter = 1;
    private final Set<String> usedDoctorNames = new HashSet<>();


    private static final List<String> DAY_ORDER = List.of(
            "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"
    );

    public DoctorSeeder(WebClient supabaseClient) {
        this.supabaseClient = supabaseClient;
    }

    @Override
    public void run(String... args) {
        if (!seederEnabled) {
            System.out.println("DoctorSeeder disabled (seeder.enabled=false). Skipping...");
            return;
        }

        System.out.println("Running DoctorSeeder...");


        if (isAlreadySeeded()) {
            System.out.println("DoctorSeeder skipped — tables already populated.");
            return;
        }

        resetTables(); 

        generateDoctorsForClinics("gp_clinic", false);
        generateDoctorsForClinics("specialist_clinic", true);

        System.out.println(" DoctorSeeder completed successfully!");
    }

private boolean isAlreadySeeded() {
        try {
            List<Map<String, Object>> doctors = supabaseClient.get()
                    .uri("/doctor?select=id&limit=1") // only need to check one row
                    .retrieve()
                    .bodyToFlux(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .collectList()
                    .block();

            return doctors != null && !doctors.isEmpty();
        } catch (Exception e) {
            System.err.println(" Failed to check doctor table: " + e.getMessage());
            return false; 
        }
    }

private void resetTables() {
    try {
        supabaseClient.post()
                .uri("/rpc/reset_seed_tables") 
                .retrieve()
                .bodyToMono(String.class)
                .block();

        System.out.println("Truncated doctor & time_slot tables (IDs reset to 1)");
    } catch (Exception e) {
        System.err.println("Failed to truncate tables via RPC: " + e.getMessage());
    }
}

    private void generateDoctorsForClinics(String table, boolean isSpecialist) {
     System.out.println("Fetching clinics from table: " + table); // ADD THIS

        List<Map<String, Object>> clinics;
        try {
            clinics = supabaseClient.get()
                    .uri("/" + table)
                    .retrieve()
                    .bodyToFlux(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .collectList()
                    .block();
        } catch (Exception e) {
            System.out.println("Failed to fetch clinics from " + table);
            return;
        }
        if (clinics == null || clinics.isEmpty()) {
            System.out.println("No clinics found in table: " + table);
            return;
        }

        Random rand = new Random();
        for (Map<String, Object> clinic : clinics) {
            String clinicName = (String) clinic.get("clinic_name");
            String clinicAddress = (String) clinic.get("address");
            if (clinicName == null || clinicAddress == null) continue;

            String speciality = isSpecialist
                    ? (String) clinic.getOrDefault("speciality", "Specialist")
                    : "General Practice";


            if (!isSpecialist) {
                createDoctorsAndSlots(
                    // if is GP default to start 9am end 5pm
                        clinic, clinicName, clinicAddress, speciality,
                        LocalTime.of(9, 0), LocalTime.of(17, 0),
                        List.of("MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"),
                        rand,
                        false
                );
            } else {
                generateSpecialistDoctors(clinic, clinicName, clinicAddress, speciality, rand);
            }

            System.out.printf("Created 4 doctors for clinic: %s%n", clinicName);
        }
    }
    

    private void generateSpecialistDoctors(Map<String, Object> clinic, String clinicName,
                                           String clinicAddress, String speciality, Random rand) {

        String clinicId = clinic.get("ihp_clinic_id") != null ? clinic.get("ihp_clinic_id").toString() : null;

        List<Doctor> doctors = new ArrayList<>();
        for (int i = 1; i <= NUM_DOCTORS; i++) {
            String doctorId = String.format("DOC%04d", doctorCounter++);
            String doctorName = generateDoctorName(rand);
            Doctor doctor = new Doctor(doctorId, doctorName, clinicId, clinicName, clinicAddress, speciality);
            postDoctor(doctor);
            doctors.add(doctor);
        }

        for (String day : DAY_ORDER) {
            LocalTime open = null, close = null;
            String[] cols;
            if (List.of("MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY").contains(day)) {
                cols = new String[]{"mon_to_fri_am","mon_to_fri_pm","mon_to_fri_night"};
            } else if (day.equals("SATURDAY")) {
                cols = new String[]{"sat_am","sat_pm","sat_night"};
            } else {
                cols = new String[]{"sun_am","sun_pm","sun_night"};
            }

            for (String col : cols) {
                String hours = (String) clinic.get(col);
                if (hours != null && !hours.equalsIgnoreCase("CLOSED")) {
                    LocalTime s = parseStart(hours, null);
                    LocalTime e = parseEnd(hours, null);
                    if (s != null && (open == null || s.isBefore(open))) open = s;
                    if (e != null && (close == null || e.isAfter(close))) close = e;
                }
            }

            if (open == null || close == null) continue; 

            for (Doctor doctor : doctors) {
                generateSlotsForDoctor(doctor, open, close, day);
            }


        }
    }

    private void createDoctorsAndSlots(Map<String, Object> clinic, String clinicName, String clinicAddress, String speciality,
                                       LocalTime open, LocalTime close, List<String> days, Random rand, boolean isSpecialist) {
        // Determine clinicId depending on clinic table source
        String clinicId = null;
        try {
            if (isSpecialist) {
                Object v = clinic.get("ihp_clinic_id");
                if (v != null) clinicId = v.toString();
            } else {
                Object v = clinic.get("clinic_id");
                if (v != null) clinicId = v.toString();
                else {
                    // fallback to s_n (numeric primary key) if clinic_id missing
                    Object sn = clinic.get("s_n");
                    if (sn != null) clinicId = sn.toString();
                }
            }
        } catch (Exception ex) {
            // leave clinicId null if parsing fails
        }

        List<Doctor> doctors = new ArrayList<>();
        for (int i = 1; i <= NUM_DOCTORS; i++) {
            String doctorId = String.format("DOC%04d", doctorCounter++);
            String doctorName = generateDoctorName(rand);
            Doctor doctor = new Doctor(doctorId, doctorName, clinicId, clinicName, clinicAddress, speciality);
            postDoctor(doctor);
            doctors.add(doctor);
        }

        for (String day : days) {
            for (Doctor doctor : doctors) {
                generateSlotsForDoctor(doctor, open, close, day);
            }
        }
    }

    private String generateDoctorName(Random rand) {

    String[] first = {
        "Alex","Benjamin","Chloe","Darren","Emily","Farah","Gabriel","Hui Ling","Ivan","Jessica",
        "Marcus","Natalie","Ryan","Samantha","Tze Wei","Ashley","Bryan","Caitlyn","Daniel","Ethan",
        "Fiona","Grace","Hannah","Isabelle","Jared","Kayla","Lucas","Megan","Nicholas","Olivia",
        "Patrick","Qi En","Rachel","Samuel","Tracy","Umairah","Valerie","William","Xin Yi","Yong Jie",
        "Zara","Abigail","Brandon","Clarissa","Dominic","Elaine","Felix","Gavin","Hazel","Irfan",
        "Jolene","Kenneth","Lydia","Michelle","Noah","Oscar","Priscilla","Qian Hui","Rebecca","Sean",
        "Tiffany","Victor","Wen Hao","Ying Ying","Zhi Wei"
    };

    String[] last = {
        "Tan","Lim","Ng","Lee","Chong","Wong","Cheong","Toh","Sim","Low","Seah","Phua","Chan","Goh",
        "Teo","Pang","Chua","Ong","Ho","Koh","Foo","Loh","Ang","Liew","Quek","Ngoh","Toh","Seet",
        "Yap","Chee","Mak","Peh","Tanaka","Chen","Wang","Liu","Zhang","Yeo","Heng","Soh"
    };

    String fullName;
    int maxTries = 100;
    int tries = 0;

    do {
        String candidate = "Dr " + first[rand.nextInt(first.length)] + " " + last[rand.nextInt(last.length)];
        fullName = candidate;
        tries++;
    } while (usedDoctorNames.contains(fullName) && tries < maxTries);

    usedDoctorNames.add(fullName);
    return fullName;
}


    private void postDoctor(Doctor doctor) {
        try {
            supabaseClient.post()
                    .uri("/doctor")
                    .bodyValue(doctor)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            System.out.println("Inserted doctor: " + doctor.getDoctorName());
        } catch (Exception e) {
            System.err.println("Failed to insert doctor: " + doctor.getDoctorName());
            e.printStackTrace();
        }
    }

    private void generateSlotsForDoctor(Doctor doctor, LocalTime start, LocalTime end, String dayOfWeek) {
        LocalTime slotStart = start;


        while (slotStart.isBefore(end)) {
            LocalTime slotEnd = slotStart.plusMinutes(SLOT_MINUTES);
            if (slotEnd.isAfter(end)) break;
            

        // Prepare payload with start/end as strings to avoid serialization issues
        Map<String, Object> slotPayload = new HashMap<>();
        slotPayload.put("doctor_id", doctor.getDoctorId());
        slotPayload.put("doctor_name", doctor.getDoctorName());
        slotPayload.put("day_of_week", dayOfWeek);
        slotPayload.put("start_time", slotStart.format(DateTimeFormatter.ofPattern("HH:mm:ss")));
        slotPayload.put("end_time", slotEnd.format(DateTimeFormatter.ofPattern("HH:mm:ss")));

        try {
                String resp = supabaseClient.post()
                        .uri("/time_slot")
                        .header("Prefer", "return=representation")
                        .bodyValue(slotPayload)
                        .retrieve()
                        .bodyToMono(String.class)
                        .block();

                System.out.println("Slot: " + doctor.getDoctorId() + " | " + dayOfWeek
                        + " | " + slotStart + "-" + slotEnd);

                // If server returned the created row(s), parse the id and print it
                if (resp != null && !resp.isBlank()) {
                    try {
                        JsonNode arr = om.readTree(resp);
                        if (arr.isArray() && arr.size() > 0) {
                            JsonNode first = arr.get(0);
                            if (first.has("id") && !first.get("id").isNull()) {
                                System.out.println("Inserted slot id: " + first.get("id").asLong());
                            }
                        }
                    } catch (Exception ex) {
                        // ignore parsing errors but log for debug
                        System.err.println("Failed to parse insert response: " + ex.getMessage());
                    }
                }
        } catch (Exception e) {
        System.err.println("Failed to insert slot for "
            + doctor.getDoctorId() + " on " + dayOfWeek
            + " at " + slotStart);
        // If it's an HTTP error, print the response body (useful for Supabase errors)
        if (e instanceof org.springframework.web.reactive.function.client.WebClientResponseException w) {
            System.err.println("Response body: " + w.getResponseBodyAsString());
        }
        e.printStackTrace();
        }

            slotStart = slotEnd;
        }
    }

    private LocalTime parseStart(String str, LocalTime def) {
        if (str == null || str.isBlank() || str.equalsIgnoreCase("CLOSED")) return def;
        try {
            String[] parts = str.split("-");
            String s = parts[0].replace(":", "").trim();
            if (s.length() == 3) s = "0" + s;
            return LocalTime.parse(s, DateTimeFormatter.ofPattern("HHmm"));
        } catch (Exception e) { return def; }
    }

    private LocalTime parseEnd(String str, LocalTime def) {
        if (str == null || str.isBlank() || str.equalsIgnoreCase("CLOSED")) return def;
        try {
            String[] parts = str.split("-");
            String e = parts[1].replace(":", "").trim();
            if (e.length() == 3) e = "0" + e;
            return LocalTime.parse(e, DateTimeFormatter.ofPattern("HHmm"));
        } catch (Exception ex) { return def; }
    }
}
