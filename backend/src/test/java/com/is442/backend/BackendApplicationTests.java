package com.is442.backend;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest(
		classes = BackendApplication.class,
		webEnvironment = SpringBootTest.WebEnvironment.NONE
)
@ActiveProfiles("test")
class BackendApplicationTests {
	@Test void contextLoads() {}
}