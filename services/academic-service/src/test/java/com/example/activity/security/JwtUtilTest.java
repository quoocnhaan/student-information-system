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
        ReflectionTestUtils.setField(jwtUtil, "secret", "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970");
        ReflectionTestUtils.setField(jwtUtil, "expiration", 315360000000L); // 10 years
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
