package com.example.enrollmentservice.dto;

import lombok.Data;

@Data
public class EnrollmentRequest {
    private String studentId;
    private String classId;
    private String periodId;
}
