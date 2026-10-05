package com.example.demo.controller;

import com.example.demo.dto.request.AssignmentStudentApproveRequest;
import com.example.demo.dto.response.AssignmentStudentApproveResponse;
import com.example.demo.service.AssignmentStudentApproveService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/assignment-student-approves")
@RequiredArgsConstructor
public class AssignmentStudentApproveController {

    private final AssignmentStudentApproveService assignmentStudentApproveService;

    @PostMapping
    public ResponseEntity<AssignmentStudentApproveResponse> create(@Valid @RequestBody AssignmentStudentApproveRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assignmentStudentApproveService.create(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AssignmentStudentApproveResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(assignmentStudentApproveService.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<AssignmentStudentApproveResponse>> getAll() {
        return ResponseEntity.ok(assignmentStudentApproveService.getAll());
    }

    @GetMapping("/by-assignment/{idAssignment}")
    public ResponseEntity<List<AssignmentStudentApproveResponse>> getByAssignment(@PathVariable String idAssignment) {
        return ResponseEntity.ok(assignmentStudentApproveService.getByAssignment(idAssignment));
    }

    @GetMapping("/by-student/{idStudent}")
    public ResponseEntity<List<AssignmentStudentApproveResponse>> getByStudent(@PathVariable String idStudent) {
        return ResponseEntity.ok(assignmentStudentApproveService.getByStudent(idStudent));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AssignmentStudentApproveResponse> update(@PathVariable String id, @Valid @RequestBody AssignmentStudentApproveRequest request) {
        return ResponseEntity.ok(assignmentStudentApproveService.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        assignmentStudentApproveService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
