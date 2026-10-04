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
public class StudentScoreRequest {

    @Size(max = 50, message = "idScore must be at most 50 characters")
    private String idScore;

    @NotBlank(message = "idGradeComponents is required")
    private String idGradeComponents;

    @NotBlank(message = "enrollmentId is required")
    private String enrollmentId;

    @NotNull(message = "score is required")
    @DecimalMin(value = "0.0", message = "score must be at least 0.0")
    @DecimalMax(value = "10.0", message = "score must be at most 10.0")
    private BigDecimal score;
}
