package com.example.activity.controller;

import com.example.activity.dto.request.StudentScoreRequest;
import com.example.activity.dto.response.StudentScoreResponse;
import com.example.activity.service.StudentScoreService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/student-scores")
@RequiredArgsConstructor
public class StudentScoreController {

    private final StudentScoreService studentScoreService;

    @GetMapping
    public ResponseEntity<List<StudentScoreResponse>> getAll() {
        return ResponseEntity.ok(studentScoreService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudentScoreResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(studentScoreService.getById(id));
    }

    @PostMapping
    public ResponseEntity<StudentScoreResponse> create(@Valid @RequestBody StudentScoreRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(studentScoreService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<StudentScoreResponse> update(@PathVariable String id, @Valid @RequestBody StudentScoreRequest request) {
        return ResponseEntity.ok(studentScoreService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        studentScoreService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
