package com.example.activity.controller;

import com.example.activity.dto.request.GradeComponentRequest;
import com.example.activity.dto.response.GradeComponentResponse;
import com.example.activity.service.GradeComponentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/grade-components")
@RequiredArgsConstructor
public class GradeComponentController {

    private final GradeComponentService gradeComponentService;

    @GetMapping
    public ResponseEntity<List<GradeComponentResponse>> getAll() {
        return ResponseEntity.ok(gradeComponentService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<GradeComponentResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(gradeComponentService.getById(id));
    }

    @PostMapping
    public ResponseEntity<GradeComponentResponse> create(@Valid @RequestBody GradeComponentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(gradeComponentService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GradeComponentResponse> update(@PathVariable String id, @Valid @RequestBody GradeComponentRequest request) {
        return ResponseEntity.ok(gradeComponentService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        gradeComponentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
