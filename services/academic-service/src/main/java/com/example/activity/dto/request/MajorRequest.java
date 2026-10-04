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
public class MajorRequest {

    @Size(max = 50, message = "majorId must be at most 50 characters")
    private String majorId;

    @NotBlank(message = "facultyId is required")
    private String facultyId;

    @NotBlank(message = "name is required")
    @Size(max = 255, message = "name must be at most 255 characters")
    private String name;
}
