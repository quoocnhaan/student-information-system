package com.example.activity.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CourseRequest {

    @Size(max = 50, message = "idCourse must be at most 50 characters")
    private String idCourse;

    @NotBlank(message = "majorId is required")
    private String majorId;

    @NotBlank(message = "name is required")
    @Size(max = 255, message = "name must be at most 255 characters")
    private String name;

    @NotNull(message = "credits is required")
    @Positive
    private Integer credits;
}
