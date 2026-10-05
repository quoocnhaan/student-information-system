package com.example.enrollmentservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnrollmentResponse {
    private String enrollmentId;
    private String studentId;
    private String classId;
    private String courseCode;
    private String courseName;
    private String status; // ENROLLED, WAITING, FAILED
    private String message;
    private LocalDateTime enrolledAt;
}
