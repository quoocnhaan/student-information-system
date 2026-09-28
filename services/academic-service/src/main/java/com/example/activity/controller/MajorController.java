package com.example.activity.controller;

import com.example.activity.dto.request.MajorRequest;
import com.example.activity.dto.response.MajorResponse;
import com.example.activity.service.MajorService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/majors")
@RequiredArgsConstructor
public class MajorController {

    private final MajorService majorService;

    @GetMapping
    public ResponseEntity<List<MajorResponse>> getAll() {
        return ResponseEntity.ok(majorService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MajorResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(majorService.getById(id));
    }

    @PostMapping
    public ResponseEntity<MajorResponse> create(@Valid @RequestBody MajorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(majorService.create(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MajorResponse> update(@PathVariable String id, @Valid @RequestBody MajorRequest request) {
        return ResponseEntity.ok(majorService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        majorService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
