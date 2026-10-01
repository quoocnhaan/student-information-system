package com.example.demo.controller;

import com.example.demo.dto.request.AttemptRequest;
import com.example.demo.dto.response.AttemptResponse;
import com.example.demo.service.AttemptService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/attempts")
@RequiredArgsConstructor
public class AttemptController {

    private final AttemptService attemptService;

    @PostMapping
    public ResponseEntity<AttemptResponse> create(@Valid @RequestBody AttemptRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(attemptService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AttemptResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(attemptService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<AttemptResponse>> getAll() {
        return ResponseEntity.ok(attemptService.getAll());
    }

    @GetMapping("/by-quiz/{idQuiz}")
    public ResponseEntity<List<AttemptResponse>> getByQuiz(@PathVariable String idQuiz) {
        return ResponseEntity.ok(attemptService.getByQuiz(idQuiz));
    }

    @GetMapping("/by-student/{idStudent}")
    public ResponseEntity<List<AttemptResponse>> getByStudent(@PathVariable String idStudent) {
        return ResponseEntity.ok(attemptService.getByStudent(idStudent));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AttemptResponse> update(@PathVariable String id, @Valid @RequestBody AttemptRequest request) {
        return ResponseEntity.ok(attemptService.update(id, request));
    }

    @PatchMapping("/{id}/grade")
    public ResponseEntity<AttemptResponse> updateGrade(
            @PathVariable String id,
            @RequestBody(required = false) AttemptRequest request,
            @RequestParam(required = false) Float grade) {
        Float finalGrade = grade;
        if (finalGrade == null && request != null) {
            finalGrade = request.getGrade();
        }
        return ResponseEntity.ok(attemptService.updateGrade(id, finalGrade));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        attemptService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
