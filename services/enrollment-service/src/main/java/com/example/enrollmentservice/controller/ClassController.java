package com.example.enrollmentservice.controller;

import com.example.enrollmentservice.entity.ClassEntity;
import com.example.enrollmentservice.exception.BadRequestException;
import com.example.enrollmentservice.exception.DuplicateResourceException;
import com.example.enrollmentservice.exception.ResourceNotFoundException;
import com.example.enrollmentservice.repository.ClassRepository;
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
@RequestMapping("/classes")
@RequiredArgsConstructor
@Tag(name = "Lớp học", description = "API quản lý lớp học (ClassEntity)")
public class ClassController {

    private final ClassRepository classRepository;

    @Operation(summary = "Lấy tất cả lớp học", description = "Yêu cầu quyền ADMIN")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @GetMapping
    public ResponseEntity<List<ClassEntity>> getAllClasses() {
        return ResponseEntity.ok(classRepository.findAll());
    }

    @Operation(summary = "Lấy lớp học theo học kỳ", description = "Trả về danh sách lớp theo mã học kỳ")
    @GetMapping("/semester/{semesterId}")
    public ResponseEntity<List<ClassEntity>> getClassesBySemester(
            @Parameter(description = "Mã học kỳ, ví dụ: SEM_2024_1") @PathVariable String semesterId) {
        return ResponseEntity.ok(classRepository.findBySemesterId(semesterId));
    }

    @Operation(summary = "Tạo lớp học mới", description = "Yêu cầu quyền ADMIN")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PostMapping
    public ResponseEntity<ClassEntity> createClass(@RequestBody ClassEntity classEntity) {
        if (classEntity.getMaxCapacity() != null && classEntity.getMaxCapacity() < 0) {
            throw new BadRequestException("Sĩ số tối đa không thể âm.");
        }
        if (classEntity.getCurrentEnrolled() != null && classEntity.getCurrentEnrolled() < 0) {
            throw new BadRequestException("Số lượng sinh viên hiện tại không thể âm.");
        }
        if (classEntity.getClassId() != null && classRepository.existsById(classEntity.getClassId())) {
            throw new DuplicateResourceException("Mã lớp học đã tồn tại: " + classEntity.getClassId());
        }
        if (classEntity.getCurrentEnrolled() == null) {
            classEntity.setCurrentEnrolled(0);
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(classRepository.save(classEntity));
    }

    @Operation(summary = "Cập nhật lớp học", description = "Yêu cầu quyền ADMIN")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PutMapping("/{classId}")
    public ResponseEntity<ClassEntity> updateClass(
            @Parameter(description = "Mã lớp học") @PathVariable String classId,
            @RequestBody ClassEntity classEntity) {
        if (!classRepository.existsById(classId)) {
            throw new ResourceNotFoundException("Không tìm thấy lớp học với mã: " + classId);
        }
        if (classEntity.getMaxCapacity() != null && classEntity.getMaxCapacity() < 0) {
            throw new BadRequestException("Sĩ số tối đa không thể âm.");
        }
        classEntity.setClassId(classId);
        return ResponseEntity.ok(classRepository.save(classEntity));
    }

    @Operation(summary = "Xóa lớp học", description = "Yêu cầu quyền ADMIN")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @DeleteMapping("/{classId}")
    public ResponseEntity<Void> deleteClass(
            @Parameter(description = "Mã lớp học") @PathVariable String classId) {
        if (!classRepository.existsById(classId)) {
            throw new ResourceNotFoundException("Không tìm thấy lớp học với mã: " + classId);
        }
        classRepository.deleteById(classId);
        return ResponseEntity.noContent().build();
    }
}