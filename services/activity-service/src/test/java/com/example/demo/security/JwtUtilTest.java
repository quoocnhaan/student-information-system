package com.example.demo.security;

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
    void testValidatePredefinedTokens() {
        String adminToken = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJST0xFX0FETUlOIiwicm9sZXMiOlsiUk9MRV9BRE1JTiJdLCJpYXQiOjE3OTA2NzQ1NTIsImV4cCI6MjEwNjAzNDU1Mn0.4d95Rhj9mIzenP1ME7T9uMABuv1uoLLDH7MOc4nuNq-gkMF7DOf9My7Hq57Kp9N3gUx9zoxBMtbPckv456UisA";
        String lecturerToken = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJsZWN0dXJlcl8wMSIsInJvbGUiOiJST0xFX0xFQ1RVUkVSIiwicm9sZXMiOlsiUk9MRV9MRUNUVVJFUiJdLCJpYXQiOjE3OTA2NzQ1NTMsImV4cCI6MjEwNjAzNDU1M30.dMm39TRGrE9RuZu5O3tMc7r2ukXrTKChe4lZmVUqdCthFe0i2HeeN5OYc0piZnFQISIK_2pq844BZxrh2O5C9Q";
        String studentToken = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJzdHVkZW50XzAxIiwicm9sZSI6IlJPTEVfU1RVREVOVCIsInJvbGVzIjpbIlJPTEVfU1RVREVOVCJdLCJpYXQiOjE3OTA2NzQ1NTMsImV4cCI6MjEwNjAzNDU1M30.QmmEA9Fr6-sLzeUBFoKeroVA19SrkYwFjTXYfw8MRFAaHXTewZbhKOnwCOdOOmiVWsvlunIE972M8mylvgriRg";

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
