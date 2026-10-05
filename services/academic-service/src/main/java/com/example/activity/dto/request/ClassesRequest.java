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
public class ClassesRequest {

    @Size(max = 50, message = "idClasses must be at most 50 characters")
    private String idClasses;

    @NotBlank(message = "courseId is required")
    private String courseId;

    @NotBlank(message = "semesterId is required")
    private String semesterId;

    @Positive(message = "capacity must be greater than 0")
    private Integer capacity;

    @Size(max = 50, message = "status must be at most 50 characters")
    private String status;

    @Size(max = 50, message = "room must be at most 50 characters")
    private String room;

    @Size(max = 50, message = "lecturerId must be at most 50 characters")
    private String lecturerId;

    @Size(max = 50, message = "day must be at most 50 characters")
    private String day;
}
