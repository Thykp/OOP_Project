
package com.is442.backend.controller;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ClinicController {
    private final JdbcTemplate jdbcTemplate;

    public ClinicController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/gp")
    public List<Map<String, Object>> getGpClinics() {
        return jdbcTemplate.queryForList("SELECT * FROM \"gp_clinic\" LIMIT 5");
    }

    @GetMapping("/specialist")
    public List<Map<String, Object>> getSpecialistClinics() {
        return jdbcTemplate.queryForList("SELECT * FROM \"specialist_clinic\" LIMIT 5");
    }
}
