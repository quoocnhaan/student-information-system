package com.example.enrollmentservice.controller;

import com.example.enrollmentservice.security.JwtTokenProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Xác thực (Test - Dev Profile)", description = "API lấy token test cho các role khác nhau trong môi trường Dev")
public class TestAuthController {

    private final JwtTokenProvider tokenProvider;

    @Operation(summary = "Lấy token test", description = "Chỉ bật ở profile dev. Trả về JWT token cho ADMIN, LECTURER, STUDENT.")
    @GetMapping("/test-tokens")
    public Map<String, String> getTestTokens() {
        Map<String, String> tokens = new HashMap<>();
        tokens.put("ROLE_ADMIN", "Bearer " + tokenProvider.generateToken("admin_user", "ROLE_ADMIN"));
        tokens.put("ROLE_LECTURER", "Bearer " + tokenProvider.generateToken("lecturer_user", "ROLE_LECTURER"));
        tokens.put("ROLE_STUDENT", "Bearer " + tokenProvider.generateToken("student_user", "ROLE_STUDENT"));
        return tokens;
    }
}
