package com.example.enrollmentservice.controller;

import com.example.enrollmentservice.entity.EnrollmentHistory;
import com.example.enrollmentservice.service.EnrollmentHistoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import java.util.List;

@RestController
@RequestMapping("/api/v1/enrollment-histories")
@RequiredArgsConstructor
@Tag(name = "Lịch sử đăng ký", description = "API quản lý lịch sử đăng ký học phần")
public class EnrollmentHistoryController {
    private final EnrollmentHistoryService historyService;

    @Operation(summary = "Lấy tất cả lịch sử đăng ký")
    @GetMapping
    public ResponseEntity<List<EnrollmentHistory>> getAllHistories() { return ResponseEntity.ok(historyService.getAllHistories()); }
    
    @Operation(summary = "Lấy lịch sử theo ID")
    @GetMapping("/{id}")
    public ResponseEntity<EnrollmentHistory> getHistoryById(
            @Parameter(description = "Mã lịch sử") @PathVariable String id) { 
        EnrollmentHistory history = historyService.getHistoryById(id);
        return history != null ? ResponseEntity.ok(history) : ResponseEntity.notFound().build();
    }
    
    @Operation(summary = "Tạo lịch sử đăng ký mới", description = "Yêu cầu quyền ADMIN")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PostMapping
    public ResponseEntity<EnrollmentHistory> createHistory(@RequestBody EnrollmentHistory history) { return ResponseEntity.ok(historyService.saveHistory(history)); }
    
    @Operation(summary = "Cập nhật lịch sử đăng ký")
    @PutMapping("/{id}")
    public ResponseEntity<EnrollmentHistory> updateHistory(
            @Parameter(description = "Mã lịch sử") @PathVariable String id,
            @RequestBody EnrollmentHistory history) { 
        history.setHistoryId(id);
        return ResponseEntity.ok(historyService.saveHistory(history)); 
    }
    
    @Operation(summary = "Xóa lịch sử đăng ký")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteHistory(
            @Parameter(description = "Mã lịch sử") @PathVariable String id) { 
        historyService.deleteHistory(id);
        return ResponseEntity.noContent().build();
    }
}
