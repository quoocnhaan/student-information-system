package com.example.activity.security;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth Helper", description = "API hỗ trợ lấy Fixed JWT Token cho các Role để test")
public class AuthTokenHelperController {

    private final JwtUtil jwtUtil;

    @GetMapping("/tokens")
    @Operation(summary = "Lấy danh sách các JWT Token cố định cho ADMIN, LECTURER, STUDENT để test")
    public ResponseEntity<Map<String, Object>> getFixedTokens() {
        Map<String, Object> tokens = new LinkedHashMap<>();
        tokens.put("ADMIN_TOKEN", jwtUtil.generateToken("admin", "ROLE_ADMIN"));
        tokens.put("LECTURER_TOKEN", jwtUtil.generateToken("lecturer_01", "ROLE_LECTURER"));
        tokens.put("STUDENT_TOKEN", jwtUtil.generateToken("student_01", "ROLE_STUDENT"));
        tokens.put("note", "Copy chuỗi token và dán vào nút Authorize trên Swagger UI hoặc gửi kèm header 'Authorization: Bearer <token>'");
        return ResponseEntity.ok(tokens);
    }
}
