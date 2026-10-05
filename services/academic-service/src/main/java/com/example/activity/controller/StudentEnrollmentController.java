package com.example.activity.controller;

import com.example.activity.dto.request.StudentEnrollmentRequest;
import com.example.activity.dto.response.StudentEnrollmentResponse;
import com.example.activity.service.StudentEnrollmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/student-enrollments")
@RequiredArgsConstructor
public class StudentEnrollmentController {

    private final StudentEnrollmentService studentEnrollmentService;

    @GetMapping
    public ResponseEntity<List<StudentEnrollmentResponse>> getAll() {
        return ResponseEntity.ok(studentEnrollmentService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudentEnrollmentResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(studentEnrollmentService.getById(id));
    }

    @PostMapping
    public ResponseEntity<StudentEnrollmentResponse> create(@Valid @RequestBody StudentEnrollmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(studentEnrollmentService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<StudentEnrollmentResponse> update(@PathVariable String id, @Valid @RequestBody StudentEnrollmentRequest request) {
        return ResponseEntity.ok(studentEnrollmentService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        studentEnrollmentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
