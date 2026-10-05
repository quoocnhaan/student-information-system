package com.example.activity.controller;

import com.example.activity.dto.request.ClassesGradeComponentRequest;
import com.example.activity.dto.response.ClassesGradeComponentResponse;
import com.example.activity.service.ClassesGradeComponentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/classes-grade-components")
@RequiredArgsConstructor
public class ClassesGradeComponentController {

    private final ClassesGradeComponentService classesGradeComponentService;

    @GetMapping
    public ResponseEntity<List<ClassesGradeComponentResponse>> getAll() {
        return ResponseEntity.ok(classesGradeComponentService.getAll());
    }

    @GetMapping("/class/{idClasses}")
    public ResponseEntity<List<ClassesGradeComponentResponse>> getByClassId(@PathVariable String idClasses) {
        return ResponseEntity.ok(classesGradeComponentService.getByClassId(idClasses));
    }

    @GetMapping("/{idClasses}/{idGradeComponents}")
    public ResponseEntity<ClassesGradeComponentResponse> getById(@PathVariable String idClasses, @PathVariable String idGradeComponents) {
        return ResponseEntity.ok(classesGradeComponentService.getById(idClasses, idGradeComponents));
    }

    @PostMapping
    public ResponseEntity<ClassesGradeComponentResponse> create(@Valid @RequestBody ClassesGradeComponentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(classesGradeComponentService.create(request));
    }

    @DeleteMapping("/{idClasses}/{idGradeComponents}")
    public ResponseEntity<Void> delete(@PathVariable String idClasses, @PathVariable String idGradeComponents) {
        classesGradeComponentService.delete(idClasses, idGradeComponents);
        return ResponseEntity.noContent().build();
    }
}
