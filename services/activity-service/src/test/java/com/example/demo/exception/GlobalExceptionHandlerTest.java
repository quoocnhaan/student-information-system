package com.example.demo.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
    }

    @Test
    @DisplayName("V-190/V-161: DataIntegrityViolationException returns 409 Conflict")
    void testHandleDataIntegrity() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException("foreign key constraint fails");

        ResponseEntity<Map<String, Object>> response = exceptionHandler.handleDataIntegrity(ex);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(409, response.getBody().get("status"));
        assertTrue(response.getBody().get("message").toString().contains("Data integrity violation"));
    }

    @Test
    @DisplayName("DuplicateResourceException returns 409 Conflict")
    void testHandleDuplicate() {
        DuplicateResourceException ex = new DuplicateResourceException("Quiz already exists");

        ResponseEntity<Map<String, Object>> response = exceptionHandler.handleDuplicate(ex);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(409, response.getBody().get("status"));
        assertEquals("Quiz already exists", response.getBody().get("message"));
    }

    @Test
    @DisplayName("IllegalArgumentException returns 400 Bad Request")
    void testHandleBadRequest() {
        IllegalArgumentException ex = new IllegalArgumentException("name khong duoc vuot qua 255 ky tu");

        ResponseEntity<Map<String, Object>> response = exceptionHandler.handleBadRequest(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(400, response.getBody().get("status"));
        assertEquals("name khong duoc vuot qua 255 ky tu", response.getBody().get("message"));
    }
}
