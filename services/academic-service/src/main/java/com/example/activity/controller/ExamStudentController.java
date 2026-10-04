package com.example.activity.controller;

import com.example.activity.dto.request.ExamStudentRequest;
import com.example.activity.dto.response.ExamStudentResponse;
import com.example.activity.service.ExamStudentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/exam-students")
@RequiredArgsConstructor
public class ExamStudentController {

    private final ExamStudentService examStudentService;

    @GetMapping
    public ResponseEntity<List<ExamStudentResponse>> getAll() {
        return ResponseEntity.ok(examStudentService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExamStudentResponse> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(examStudentService.getById(id));
    }

    @PostMapping
    public ResponseEntity<ExamStudentResponse> create(@Valid @RequestBody ExamStudentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(examStudentService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExamStudentResponse> update(@PathVariable Integer id, @Valid @RequestBody ExamStudentRequest request) {
        return ResponseEntity.ok(examStudentService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        examStudentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
