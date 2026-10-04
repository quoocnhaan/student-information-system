package com.example.activity.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StudentEnrollmentRequest {

    @Size(max = 50, message = "enrollmentId must be at most 50 characters")
    private String enrollmentId;

    @NotBlank(message = "studentId is required")
    @Size(max = 50, message = "studentId must be at most 50 characters")
    private String studentId;

    @Size(max = 50, message = "enrollmentStatus must be at most 50 characters")
    private String enrollmentStatus;

    @DecimalMin(value = "0.0", message = "finalScore must be at least 0.0")
    @DecimalMax(value = "10.0", message = "finalScore must be at most 10.0")
    private BigDecimal finalScore;

    @NotBlank(message = "idClasses is required")
    private String idClasses;

    @Size(max = 10, message = "letterGrade must be at most 10 characters")
    private String letterGrade;

    private Boolean isPassed;
}
