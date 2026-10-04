package com.example.demo.controller;

import com.example.demo.dto.request.QuizRequest;
import com.example.demo.dto.response.QuizResponse;
import com.example.demo.service.QuizService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/quizzes")
@RequiredArgsConstructor
public class QuizController {

    private final QuizService quizService;

    @PostMapping
    public ResponseEntity<QuizResponse> create(@Valid @RequestBody QuizRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(quizService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<QuizResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(quizService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<QuizResponse>> getAll() {
        return ResponseEntity.ok(quizService.getAll());
    }

    @GetMapping("/by-activity/{idActivity}")
    public ResponseEntity<QuizResponse> getByActivity(@PathVariable String idActivity) {
        return ResponseEntity.ok(quizService.getByActivity(idActivity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<QuizResponse> update(@PathVariable String id, @Valid @RequestBody QuizRequest request) {
        return ResponseEntity.ok(quizService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        quizService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
