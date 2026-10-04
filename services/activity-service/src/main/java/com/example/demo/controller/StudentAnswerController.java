package com.example.demo.controller;

import com.example.demo.dto.request.StudentAnswerRequest;
import com.example.demo.dto.response.StudentAnswerResponse;
import com.example.demo.service.StudentAnswerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/student-answers")
@RequiredArgsConstructor
public class StudentAnswerController {

    private final StudentAnswerService studentAnswerService;

    @PostMapping
    public ResponseEntity<StudentAnswerResponse> create(@Valid @RequestBody StudentAnswerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(studentAnswerService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StudentAnswerResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(studentAnswerService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<StudentAnswerResponse>> getAll() {
        return ResponseEntity.ok(studentAnswerService.getAll());
    }

    @GetMapping("/by-attempt/{idAttempt}")
    public ResponseEntity<List<StudentAnswerResponse>> getByAttempt(@PathVariable String idAttempt) {
        return ResponseEntity.ok(studentAnswerService.getByAttempt(idAttempt));
    }

    @PutMapping("/{id}")
    public ResponseEntity<StudentAnswerResponse> update(@PathVariable String id, @Valid @RequestBody StudentAnswerRequest request) {
        return ResponseEntity.ok(studentAnswerService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        studentAnswerService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
