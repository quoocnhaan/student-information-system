package com.example.activity.dto.request;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ExamScheduleRequest {

    @Size(max = 50, message = "examId must be at most 50 characters")
    private String examId;

    @NotBlank(message = "semesterId is required")
    private String semesterId;

    @NotBlank(message = "idClasses is required")
    private String idClasses;

    @Size(max = 50, message = "room must be at most 50 characters")
    private String room;

    @NotNull(message = "startTime is required")
    private LocalDateTime startTime;

    @NotNull(message = "endTime is required")
    private LocalDateTime endTime;

    @Positive(message = "capacity must be greater than 0")
    private Integer capacity;

    @Size(max = 50, message = "type must be at most 50 characters")
    private String type;
}
