package com.is442.backend.config;
import com.is442.backend.model.Doctor;
import com.is442.backend.model.TimeSlot;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Component
public class DoctorSeeder implements CommandLineRunner {

    private final WebClient supabaseClient;

    @Value("${seeder.enabled:true}")
    private boolean seederEnabled;

    private static final int NUM_DOCTORS = 4;
    private static final int SLOT_MINUTES = 30;
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
            String clinicName = (String) clinic.get("Clinic_name");
            String clinicAddress = (String) clinic.get("Address");
            if (clinicName == null || clinicAddress == null) continue;

            String speciality = isSpecialist
                    ? (String) clinic.getOrDefault("Speciality", "Specialist")
                    : "General Practice";


            if (!isSpecialist) {
                createDoctorsAndSlots(
                    // if is GP default to start 9am end 5pm
                        clinicName, clinicAddress, speciality,
                        LocalTime.of(9, 0), LocalTime.of(17, 0),
                        List.of("MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"),
                        rand
                );
            } else {
                generateSpecialistDoctors(clinic, clinicName, clinicAddress, speciality, rand);
            }

            System.out.printf("Created 4 doctors for clinic: %s%n", clinicName);
        }
    }
    

    private void generateSpecialistDoctors(Map<String, Object> clinic, String clinicName,
                                           String clinicAddress, String speciality, Random rand) {
        List<Doctor> doctors = new ArrayList<>();
        for (int i = 1; i <= NUM_DOCTORS; i++) {
            String doctorId = String.format("DOC%04d", doctorCounter++);
            String doctorName = generateDoctorName(rand);
            Doctor doctor = new Doctor(doctorId, doctorName, clinicName, clinicAddress, speciality);
            postDoctor(doctor);
            doctors.add(doctor);
        }

        for (String day : DAY_ORDER) {
            LocalTime open = null, close = null;
            String[] cols;
            if (List.of("MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY").contains(day)) {
                cols = new String[]{"Mon_to_fri_am","Mon_to_fri_pm","Mon_to_fri_night"};
            } else if (day.equals("SATURDAY")) {
                cols = new String[]{"Sat_am","Sat_pm","Sat_night"};
            } else {
                cols = new String[]{"Sun_am","Sun_pm","Sun_night"};
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

    private void createDoctorsAndSlots(String clinicName, String clinicAddress, String speciality,
                                       LocalTime open, LocalTime close, List<String> days, Random rand) {
      

        List<Doctor> doctors = new ArrayList<>();
        for (int i = 1; i <= NUM_DOCTORS; i++) {
            String doctorId = String.format("DOC%04d", doctorCounter++);
            String doctorName = generateDoctorName(rand);
            Doctor doctor = new Doctor(doctorId, doctorName, clinicName, clinicAddress, speciality);
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
            

            TimeSlot slot = new TimeSlot(
                    doctor.getDoctorId(),
                    doctor.getDoctorName(),
                    dayOfWeek,
                    slotStart,
                    slotEnd,
                    true
            );
    


            try {
                supabaseClient.post()
                        .uri("/time_slot")
                        .bodyValue(slot)
                        .retrieve()
                        .bodyToMono(String.class)
                        .block();
                System.out.println("Slot: " + doctor.getDoctorId() + " | " + dayOfWeek
                        + " | " + slotStart + "-" + slotEnd);
            } catch (Exception e) {
                System.err.println("Failed to insert slot for "
                        + doctor.getDoctorId() + " on " + dayOfWeek
                        + " at " + slotStart);
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
