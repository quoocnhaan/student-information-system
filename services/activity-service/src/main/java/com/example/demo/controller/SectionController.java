package com.example.demo.controller;

import com.example.demo.dto.request.SectionRequest;
import com.example.demo.dto.response.SectionResponse;
import com.example.demo.service.SectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sections")
@RequiredArgsConstructor
public class SectionController {

    private final SectionService sectionService;

    @PostMapping
    public ResponseEntity<SectionResponse> create(@Valid @RequestBody SectionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sectionService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SectionResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(sectionService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<SectionResponse>> getAll() {
        return ResponseEntity.ok(sectionService.getAll());
    }

    @GetMapping("/by-classes/{idClasses}")
    public ResponseEntity<List<SectionResponse>> getByClasses(@PathVariable String idClasses) {
        return ResponseEntity.ok(sectionService.getByClasses(idClasses));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SectionResponse> update(@PathVariable String id, @Valid @RequestBody SectionRequest request) {
        return ResponseEntity.ok(sectionService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        sectionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
