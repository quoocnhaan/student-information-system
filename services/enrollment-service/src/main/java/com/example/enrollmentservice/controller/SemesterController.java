package com.example.enrollmentservice.controller;

import com.example.enrollmentservice.entity.Semester;
import com.example.enrollmentservice.service.SemesterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/semesters")
@RequiredArgsConstructor
@Tag(name = "Học kỳ", description = "API quản lý học kỳ")
public class SemesterController {
    private final SemesterService semesterService;

    @Operation(summary = "Lấy tất cả học kỳ")
    @GetMapping
    public ResponseEntity<List<Semester>> getAllSemesters() {
        return ResponseEntity.ok(semesterService.getAllSemesters());
    }

    @Operation(summary = "Lấy học kỳ theo ID")
    @GetMapping("/{id}")
    public ResponseEntity<Semester> getSemesterById(
            @Parameter(description = "Mã học kỳ") @PathVariable String id) {
        return ResponseEntity.ok(semesterService.getSemesterById(id));
    }

    @Operation(summary = "Tạo học kỳ mới", description = "Yêu cầu quyền ADMIN")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PostMapping
    public ResponseEntity<Semester> createSemester(@RequestBody Semester semester) {
        return ResponseEntity.status(HttpStatus.CREATED).body(semesterService.createSemester(semester));
    }

    @Operation(summary = "Cập nhật học kỳ", description = "Yêu cầu quyền ADMIN")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<Semester> updateSemester(
            @Parameter(description = "Mã học kỳ") @PathVariable String id,
            @RequestBody Semester semester) {
        return ResponseEntity.ok(semesterService.updateSemester(id, semester));
    }

    @Operation(summary = "Xóa học kỳ", description = "Yêu cầu quyền ADMIN")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSemester(
            @Parameter(description = "Mã học kỳ") @PathVariable String id) {
        semesterService.deleteSemester(id);
        return ResponseEntity.noContent().build();
    }
}
