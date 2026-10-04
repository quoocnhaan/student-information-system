package com.example.demo.controller;

import com.example.demo.dto.response.ActivityResponse;
import com.example.demo.dto.request.ActivityRequest;
import com.example.demo.service.ActivityService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/activities")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityService activityService;

    @PostMapping
    public ResponseEntity<ActivityResponse> create(@Valid @RequestBody ActivityRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(activityService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ActivityResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(activityService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<ActivityResponse>> getAll() {
        return ResponseEntity.ok(activityService.getAll());
    }

    @GetMapping("/by-section/{idSection}")
    public ResponseEntity<List<ActivityResponse>> getBySection(@PathVariable String idSection) {
        return ResponseEntity.ok(activityService.getBySection(idSection));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ActivityResponse> update(@PathVariable String id, @Valid @RequestBody com.example.demo.dto.request.ActivityRequest request) {
        return ResponseEntity.ok(activityService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        activityService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
