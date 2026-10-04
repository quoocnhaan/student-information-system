package com.example.enrollmentservice.controller;

import com.example.enrollmentservice.dto.EnrollmentRequest;
import com.example.enrollmentservice.dto.EnrollmentResponse;
import com.example.enrollmentservice.entity.Enrollment;
import com.example.enrollmentservice.service.EnrollmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/api/v1/enrollments")
@RequiredArgsConstructor
@Tag(name = "Đăng ký học phần", description = "API đăng ký và quản lý đăng ký học phần")
public class EnrollmentController {

    private final EnrollmentService enrollmentService;

    @Operation(summary = "Đăng ký lớp học", description = "Sinh viên hoặc Admin đăng ký lớp học cho sinh viên")
    @PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'ROLE_ADMIN')")
    @PostMapping("/register")
    public ResponseEntity<EnrollmentResponse> registerClass(@RequestBody EnrollmentRequest request) {
        try {
            EnrollmentResponse response = enrollmentService.enroll(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                    EnrollmentResponse.builder()
                            .status("FAILED")
                            .message(e.getMessage())
                            .build()
            );
        }
    }

    @Operation(summary = "Lấy tất cả đăng ký")
    @GetMapping
    public ResponseEntity<List<Enrollment>> getAllEnrollments() {
        return ResponseEntity.ok(enrollmentService.getAllEnrollments());
    }

    @Operation(summary = "Lấy đăng ký theo ID")
    @GetMapping("/{id}")
    public ResponseEntity<Enrollment> getEnrollmentById(
            @Parameter(description = "Mã đăng ký") @PathVariable String id) {
        Enrollment enrollment = enrollmentService.getEnrollmentById(id);
        return enrollment != null ? ResponseEntity.ok(enrollment) : ResponseEntity.notFound().build();
    }

    @Operation(summary = "Xóa đăng ký")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEnrollment(
            @Parameter(description = "Mã đăng ký") @PathVariable String id) {
        enrollmentService.deleteEnrollment(id);
        return ResponseEntity.noContent().build();
    }
}
