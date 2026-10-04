package com.example.activity.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ClassesGradeComponentRequest {

    @NotBlank(message = "idClasses is required")
    private String idClasses;

    @NotBlank(message = "idGradeComponents is required")
    private String idGradeComponents;
}
