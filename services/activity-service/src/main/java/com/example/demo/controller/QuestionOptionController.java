package com.example.demo.controller;

import com.example.demo.dto.request.QuestionOptionRequest;
import com.example.demo.dto.response.QuestionOptionResponse;
import com.example.demo.service.QuestionOptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/options")
@RequiredArgsConstructor
public class QuestionOptionController {

    private final QuestionOptionService questionOptionService;

    @PostMapping
    public ResponseEntity<QuestionOptionResponse> create(@Valid @RequestBody QuestionOptionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(questionOptionService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<QuestionOptionResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(questionOptionService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<QuestionOptionResponse>> getAll() {
        return ResponseEntity.ok(questionOptionService.getAll());
    }

    @GetMapping("/by-question/{idQuestion}")
    public ResponseEntity<List<QuestionOptionResponse>> getByQuestion(@PathVariable String idQuestion) {
        return ResponseEntity.ok(questionOptionService.getByQuestion(idQuestion));
    }

    @PutMapping("/{id}")
    public ResponseEntity<QuestionOptionResponse> update(@PathVariable String id, @Valid @RequestBody QuestionOptionRequest request) {
        return ResponseEntity.ok(questionOptionService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        questionOptionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
