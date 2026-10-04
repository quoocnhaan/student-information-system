package com.example.activity.controller;

import com.example.activity.dto.request.ExamScheduleRequest;
import com.example.activity.dto.response.ExamScheduleResponse;
import com.example.activity.service.ExamScheduleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/exam-schedules")
@RequiredArgsConstructor
public class ExamScheduleController {

    private final ExamScheduleService examScheduleService;

    @GetMapping
    public ResponseEntity<List<ExamScheduleResponse>> getAll() {
        return ResponseEntity.ok(examScheduleService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExamScheduleResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(examScheduleService.getById(id));
    }

    @PostMapping
    public ResponseEntity<ExamScheduleResponse> create(@Valid @RequestBody ExamScheduleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(examScheduleService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExamScheduleResponse> update(@PathVariable String id, @Valid @RequestBody ExamScheduleRequest request) {
        return ResponseEntity.ok(examScheduleService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        examScheduleService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
