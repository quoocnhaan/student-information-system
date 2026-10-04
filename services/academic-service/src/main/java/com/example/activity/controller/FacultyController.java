package com.example.activity.controller;

import com.example.activity.dto.request.FacultyRequest;
import com.example.activity.dto.response.FacultyResponse;
import com.example.activity.service.FacultyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/faculties")
@RequiredArgsConstructor
public class FacultyController {

    private final FacultyService facultyService;

    @GetMapping
    public ResponseEntity<List<FacultyResponse>> getAll() {
        return ResponseEntity.ok(facultyService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FacultyResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(facultyService.getById(id));
    }

    @PostMapping
    public ResponseEntity<FacultyResponse> create(@Valid @RequestBody FacultyRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(facultyService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FacultyResponse> update(@PathVariable String id, @Valid @RequestBody FacultyRequest request) {
        return ResponseEntity.ok(facultyService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        facultyService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
