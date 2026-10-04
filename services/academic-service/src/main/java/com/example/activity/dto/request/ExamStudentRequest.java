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
public class ExamStudentRequest {


    @NotBlank(message = "examId is required")
    private String examId;

    @NotBlank(message = "studentId is required")
    @Size(max = 50, message = "studentId must be at most 50 characters")
    private String studentId;

    @Size(max = 50, message = "status must be at most 50 characters")
    private String status;
}
