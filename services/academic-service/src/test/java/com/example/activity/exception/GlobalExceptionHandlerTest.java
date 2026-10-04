package com.example.activity.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
    }

    @Test
    @DisplayName("A-173: MethodArgumentTypeMismatchException returns 400 Bad Request")
    void testHandleTypeMismatch() {
        MethodArgumentTypeMismatchException ex = new MethodArgumentTypeMismatchException(
                "abc", Integer.class, "id", null, new NumberFormatException("For input string: \"abc\""));

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleTypeMismatch(ex);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(400, response.getBody().getStatus());
        assertTrue(response.getBody().getMessage().contains("id"));
        assertTrue(response.getBody().getMessage().contains("abc"));
    }

    @Test
    @DisplayName("A-178: HttpRequestMethodNotSupportedException returns 405 Method Not Allowed")
    void testHandleMethodNotSupported() {
        HttpRequestMethodNotSupportedException ex = new HttpRequestMethodNotSupportedException("PATCH");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleMethodNotSupported(ex);

        assertEquals(HttpStatus.METHOD_NOT_ALLOWED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(405, response.getBody().getStatus());
        assertTrue(response.getBody().getMessage().contains("PATCH"));
    }

    @Test
    @DisplayName("A-179: NoResourceFoundException returns 404 Not Found")
    void testHandleNoResourceFound() {
        NoResourceFoundException ex = new NoResourceFoundException(HttpMethod.GET, "api/khong-ton-tai-201511");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleNoResourceFound(ex);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(404, response.getBody().getStatus());
        assertTrue(response.getBody().getMessage().contains("api/khong-ton-tai-201511"));
    }

    @Test
    @DisplayName("A-180: HttpMediaTypeNotSupportedException returns 415 Unsupported Media Type")
    void testHandleMediaTypeNotSupported() {
        HttpMediaTypeNotSupportedException ex = new HttpMediaTypeNotSupportedException(
                MediaType.APPLICATION_XML, List.of(MediaType.APPLICATION_JSON));

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleMediaTypeNotSupported(ex);

        assertEquals(HttpStatus.UNSUPPORTED_MEDIA_TYPE, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(415, response.getBody().getStatus());
        assertTrue(response.getBody().getMessage().contains("application/xml"));
    }

    @Test
    @DisplayName("Generic Exception returns 500 without leaking internal exception message")
    void testHandleGeneric_SanitizesMessage() {
        Exception ex = new RuntimeException("Sensitive database credentials or SQL syntax error");

        ResponseEntity<ErrorResponse> response = exceptionHandler.handleGeneric(ex);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(500, response.getBody().getStatus());
        assertEquals("An unexpected internal server error occurred", response.getBody().getMessage());
        assertFalse(response.getBody().getMessage().contains("Sensitive database credentials"));
    }
}
