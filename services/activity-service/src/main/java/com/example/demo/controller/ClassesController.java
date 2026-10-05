package com.example.demo.controller;

import com.example.demo.dto.request.ClassesRequest;
import com.example.demo.dto.response.ClassesResponse;
import com.example.demo.service.ClassesService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/classes")
@RequiredArgsConstructor
public class ClassesController {

    private final ClassesService classesService;

    @PostMapping
    public ResponseEntity<ClassesResponse> create(@Valid @RequestBody ClassesRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(classesService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClassesResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(classesService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<ClassesResponse>> getAll() {
        return ResponseEntity.ok(classesService.getAll());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClassesResponse> update(@PathVariable String id, @Valid @RequestBody ClassesRequest request) {
        return ResponseEntity.ok(classesService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        classesService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
