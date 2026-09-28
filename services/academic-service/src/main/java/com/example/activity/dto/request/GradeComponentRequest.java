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
public class GradeComponentRequest {

    @Size(max = 50, message = "idGradeComponents must be at most 50 characters")
    private String idGradeComponents;

    @NotBlank(message = "name is required")
    @Size(max = 100, message = "name must be at most 100 characters")
    private String name;

    @NotNull(message = "weightPercentage is required")
    @DecimalMin("0.0")
    @DecimalMax("100.0")
    private BigDecimal weightPercentage;
}
