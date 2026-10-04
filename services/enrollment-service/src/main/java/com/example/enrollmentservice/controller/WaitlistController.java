package com.example.enrollmentservice.controller;

import com.example.enrollmentservice.entity.Waitlist;
import com.example.enrollmentservice.service.WaitlistService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/waitlists")
@RequiredArgsConstructor
@Tag(name = "Danh sách chờ", description = "API quản lý danh sách chờ đăng ký")
public class WaitlistController {
    private final WaitlistService waitlistService;

    @Operation(summary = "Lấy tất cả danh sách chờ")
    @GetMapping
    public ResponseEntity<List<Waitlist>> getAllWaitlists() {
        return ResponseEntity.ok(waitlistService.getAllWaitlists());
    }

    @Operation(summary = "Lấy danh sách chờ theo ID")
    @GetMapping("/{id}")
    public ResponseEntity<Waitlist> getWaitlistById(
            @Parameter(description = "Mã danh sách chờ") @PathVariable String id) {
        return ResponseEntity.ok(waitlistService.getWaitlistById(id));
    }

    @Operation(summary = "Thêm vào danh sách chờ", description = "Yêu cầu quyền ADMIN")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PostMapping
    public ResponseEntity<Waitlist> createWaitlist(@RequestBody Waitlist waitlist) {
        return ResponseEntity.status(HttpStatus.CREATED).body(waitlistService.createWaitlist(waitlist));
    }

    @Operation(summary = "Cập nhật danh sách chờ", description = "Yêu cầu quyền ADMIN")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<Waitlist> updateWaitlist(
            @Parameter(description = "Mã danh sách chờ") @PathVariable String id,
            @RequestBody Waitlist waitlist) {
        return ResponseEntity.ok(waitlistService.updateWaitlist(id, waitlist));
    }

    @Operation(summary = "Xóa khỏi danh sách chờ", description = "Yêu cầu quyền ADMIN")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWaitlist(
            @Parameter(description = "Mã danh sách chờ") @PathVariable String id) {
        waitlistService.deleteWaitlist(id);
        return ResponseEntity.noContent().build();
    }
}
