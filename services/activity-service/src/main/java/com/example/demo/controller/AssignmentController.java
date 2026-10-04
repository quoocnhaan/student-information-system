package com.example.demo.controller;

import com.example.demo.dto.request.AssignmentRequest;
import com.example.demo.dto.response.AssignmentResponse;
import com.example.demo.service.AssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assignments")
@RequiredArgsConstructor
public class AssignmentController {

    private final AssignmentService assignmentService;

    @PostMapping
    public ResponseEntity<AssignmentResponse> create(@Valid @RequestBody AssignmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assignmentService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AssignmentResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(assignmentService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<AssignmentResponse>> getAll() {
        return ResponseEntity.ok(assignmentService.getAll());
    }

    @GetMapping("/by-activity/{idActivity}")
    public ResponseEntity<AssignmentResponse> getByActivity(@PathVariable String idActivity) {
        return ResponseEntity.ok(assignmentService.getByActivity(idActivity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AssignmentResponse> update(@PathVariable String id, @Valid @RequestBody AssignmentRequest request) {
        return ResponseEntity.ok(assignmentService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        assignmentService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
