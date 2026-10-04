package com.example.activity.controller;

import com.example.activity.dto.request.SemesterRequest;
import com.example.activity.dto.response.SemesterResponse;
import com.example.activity.service.SemesterService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/semesters")
@RequiredArgsConstructor
public class SemesterController {

    private final SemesterService semesterService;

    @GetMapping
    public ResponseEntity<List<SemesterResponse>> getAll() {
        return ResponseEntity.ok(semesterService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<SemesterResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(semesterService.getById(id));
    }

    @PostMapping
    public ResponseEntity<SemesterResponse> create(@Valid @RequestBody SemesterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(semesterService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SemesterResponse> update(@PathVariable String id, @Valid @RequestBody SemesterRequest request) {
        return ResponseEntity.ok(semesterService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        semesterService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
