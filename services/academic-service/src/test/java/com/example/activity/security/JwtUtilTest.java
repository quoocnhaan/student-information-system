package com.example.activity.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class JwtUtilTest {

    private JwtUtil jwtUtil;

    @BeforeEach
    void setUp() {
        jwtUtil = new JwtUtil();
        ReflectionTestUtils.setField(jwtUtil, "secret", "c8f1e2d3b4a5968778695a4b3c2d1e0fa1b2c3d4e5f60718293a4b5c6d7e8f90");
        ReflectionTestUtils.setField(jwtUtil, "expiration", 14400000L); // 4 hours
    }

    @Test
    void testGenerateAndValidateTokens() {
        String adminToken = jwtUtil.generateToken("admin", "ROLE_ADMIN");
        String lecturerToken = jwtUtil.generateToken("lecturer_01", "ROLE_LECTURER");
        String studentToken = jwtUtil.generateToken("student_01", "ROLE_STUDENT");

        System.out.println("=== FIXED TOKENS FOR TESTING ===");
        System.out.println("ADMIN_TOKEN: " + adminToken);
        System.out.println("LECTURER_TOKEN: " + lecturerToken);
        System.out.println("STUDENT_TOKEN: " + studentToken);
        System.out.println("================================");

        assertTrue(jwtUtil.validateToken(adminToken));
        assertTrue(jwtUtil.validateToken(lecturerToken));
        assertTrue(jwtUtil.validateToken(studentToken));

        assertEquals("admin", jwtUtil.extractUsername(adminToken));
        assertEquals("lecturer_01", jwtUtil.extractUsername(lecturerToken));
        assertEquals("student_01", jwtUtil.extractUsername(studentToken));

        List<String> adminRoles = jwtUtil.extractRoles(adminToken);
        assertTrue(adminRoles.contains("ROLE_ADMIN"));

        List<String> lecturerRoles = jwtUtil.extractRoles(lecturerToken);
        assertTrue(lecturerRoles.contains("ROLE_LECTURER"));

        List<String> studentRoles = jwtUtil.extractRoles(studentToken);
        assertTrue(studentRoles.contains("ROLE_STUDENT"));
    }
}
