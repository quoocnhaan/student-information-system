package com.example.demo.controller;

import com.example.demo.dto.request.FileRequest;
import com.example.demo.dto.response.FileResponse;
import com.example.demo.service.FileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/files")
@RequiredArgsConstructor
public class FileController {

    private final FileService fileService;

    @PostMapping
    public ResponseEntity<FileResponse> create(@Valid @RequestBody FileRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(fileService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FileResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(fileService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<FileResponse>> getAll() {
        return ResponseEntity.ok(fileService.getAll());
    }

    @GetMapping("/by-activity/{idActivity}")
    public ResponseEntity<List<FileResponse>> getByActivity(@PathVariable String idActivity) {
        return ResponseEntity.ok(fileService.getByActivity(idActivity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FileResponse> update(@PathVariable String id, @Valid @RequestBody FileRequest request) {
        return ResponseEntity.ok(fileService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        fileService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
