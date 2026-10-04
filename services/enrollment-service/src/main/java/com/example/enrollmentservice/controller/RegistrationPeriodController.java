package com.example.enrollmentservice.controller;

import com.example.enrollmentservice.entity.RegistrationPeriod;
import com.example.enrollmentservice.service.RegistrationPeriodService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import java.util.List;

@RestController
@RequestMapping("/api/v1/registration-periods")
@RequiredArgsConstructor
@Tag(name = "Đợt đăng ký", description = "API quản lý đợt đăng ký học phần")
public class RegistrationPeriodController {
    private final RegistrationPeriodService periodService;

    @Operation(summary = "Lấy tất cả đợt đăng ký")
    @GetMapping
    public ResponseEntity<List<RegistrationPeriod>> getAllPeriods() { return ResponseEntity.ok(periodService.getAllPeriods()); }
    
    @Operation(summary = "Lấy đợt đăng ký theo ID")
    @GetMapping("/{id}")
    public ResponseEntity<RegistrationPeriod> getPeriodById(
            @Parameter(description = "Mã đợt đăng ký") @PathVariable String id) { 
        RegistrationPeriod period = periodService.getPeriodById(id);
        return period != null ? ResponseEntity.ok(period) : ResponseEntity.notFound().build();
    }
    
    @Operation(summary = "Tạo đợt đăng ký mới", description = "Yêu cầu quyền ADMIN")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PostMapping
    public ResponseEntity<RegistrationPeriod> createPeriod(@RequestBody RegistrationPeriod period) { return ResponseEntity.ok(periodService.savePeriod(period)); }
    
    @Operation(summary = "Cập nhật đợt đăng ký")
    @PutMapping("/{id}")
    public ResponseEntity<RegistrationPeriod> updatePeriod(
            @Parameter(description = "Mã đợt đăng ký") @PathVariable String id,
            @RequestBody RegistrationPeriod period) { 
        period.setPeriodId(id);
        return ResponseEntity.ok(periodService.savePeriod(period)); 
    }
    
    @Operation(summary = "Xóa đợt đăng ký")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePeriod(
            @Parameter(description = "Mã đợt đăng ký") @PathVariable String id) { 
        periodService.deletePeriod(id);
        return ResponseEntity.noContent().build();
    }
}
