package com.example.demo.controller;

import com.example.demo.dto.request.QuestionRequest;
import com.example.demo.dto.response.QuestionResponse;
import com.example.demo.service.QuestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/questions")
@RequiredArgsConstructor
public class QuestionController {

    private final QuestionService questionService;

    @PostMapping
    public ResponseEntity<QuestionResponse> create(@Valid @RequestBody QuestionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(questionService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<QuestionResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(questionService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<QuestionResponse>> getAll() {
        return ResponseEntity.ok(questionService.getAll());
    }

    @GetMapping("/by-quiz/{idQuiz}")
    public ResponseEntity<List<QuestionResponse>> getByQuiz(@PathVariable String idQuiz) {
        return ResponseEntity.ok(questionService.getByQuiz(idQuiz));
    }

    @PutMapping("/{id}")
    public ResponseEntity<QuestionResponse> update(@PathVariable String id, @Valid @RequestBody QuestionRequest request) {
        return ResponseEntity.ok(questionService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        questionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
