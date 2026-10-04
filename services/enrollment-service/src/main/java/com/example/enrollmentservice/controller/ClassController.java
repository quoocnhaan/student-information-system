package com.example.enrollmentservice.controller;

import com.example.enrollmentservice.entity.ClassEntity;
import com.example.enrollmentservice.repository.ClassRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;

import java.util.List;

@RestController
@RequestMapping("/classes")
@Tag(name = "Lớp học", description = "API quản lý lớp học (ClassEntity)")
public class ClassController {

    @Autowired
    private ClassRepository classRepository;

    @Operation(summary = "Lấy tất cả lớp học", description = "Yêu cầu quyền ADMIN")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @GetMapping
    public ResponseEntity<List<ClassEntity>> getAllClasses() {
        return ResponseEntity.ok(classRepository.findAll());
    }

    // API lấy lớp học theo mã học kỳ (GET
    // http://localhost:8083/classes/semester/SEM_2024_1)
    @Operation(summary = "Lấy lớp học theo học kỳ", description = "Trả về danh sách lớp theo mã học kỳ")
    @GetMapping("/semester/{semesterId}")
    public ResponseEntity<List<ClassEntity>> getClassesBySemester(
            @Parameter(description = "Mã học kỳ, ví dụ: SEM_2024_1") @PathVariable String semesterId) {
        return ResponseEntity.ok(classRepository.findBySemesterId(semesterId));
    }

    // API tạo lớp học mới
    @Operation(summary = "Tạo lớp học mới", description = "Yêu cầu quyền ADMIN")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PostMapping
    public ResponseEntity<ClassEntity> createClass(@RequestBody ClassEntity classEntity) {
        return ResponseEntity.ok(classRepository.save(classEntity));
    }

    // API cập nhật thông tin lớp học
    @Operation(summary = "Cập nhật lớp học")
    @PutMapping("/{classId}")
    public ResponseEntity<ClassEntity> updateClass(
            @Parameter(description = "Mã lớp học") @PathVariable String classId,
            @RequestBody ClassEntity classEntity) {
        if (!classRepository.existsById(classId)) {
            return ResponseEntity.notFound().build();
        }
        classEntity.setClassId(classId); // Ensure ID consistency
        return ResponseEntity.ok(classRepository.save(classEntity));
    }

    // API xóa lớp học
    @Operation(summary = "Xóa lớp học")
    @DeleteMapping("/{classId}")
    public ResponseEntity<Void> deleteClass(
            @Parameter(description = "Mã lớp học") @PathVariable String classId) {
        if (!classRepository.existsById(classId)) {
            return ResponseEntity.notFound().build();
        }
        classRepository.deleteById(classId);
        return ResponseEntity.noContent().build();
    }
}