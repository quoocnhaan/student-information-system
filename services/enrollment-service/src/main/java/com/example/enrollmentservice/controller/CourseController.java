package com.example.enrollmentservice.controller;

import com.example.enrollmentservice.entity.Course;
import com.example.enrollmentservice.service.CourseService;
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
@RequestMapping("/api/v1/courses")
@RequiredArgsConstructor
@Tag(name = "Môn học", description = "API quản lý môn học (Course)")
public class CourseController {
    private final CourseService courseService;

    @Operation(summary = "Lấy tất cả môn học")
    @GetMapping
    public ResponseEntity<List<Course>> getAllCourses() {
        return ResponseEntity.ok(courseService.getAllCourses());
    }

    @Operation(summary = "Lấy môn học theo ID")
    @GetMapping("/{id}")
    public ResponseEntity<Course> getCourseById(
            @Parameter(description = "Mã môn học") @PathVariable String id) {
        return ResponseEntity.ok(courseService.getCourseById(id));
    }

    @Operation(summary = "Tạo môn học mới", description = "Yêu cầu quyền ADMIN")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PostMapping
    public ResponseEntity<Course> createCourse(@RequestBody Course course) {
        return ResponseEntity.status(HttpStatus.CREATED).body(courseService.createCourse(course));
    }

    @Operation(summary = "Cập nhật môn học", description = "Yêu cầu quyền ADMIN")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<Course> updateCourse(
            @Parameter(description = "Mã môn học") @PathVariable String id,
            @RequestBody Course course) {
        return ResponseEntity.ok(courseService.updateCourse(id, course));
    }

    @Operation(summary = "Xóa môn học", description = "Yêu cầu quyền ADMIN")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCourse(
            @Parameter(description = "Mã môn học") @PathVariable String id) {
        courseService.deleteCourse(id);
        return ResponseEntity.noContent().build();
    }
}
