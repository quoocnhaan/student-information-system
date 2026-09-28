package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttemptRequest {

    @NotBlank(message = "idQuiz khong duoc de trong")
    private String idQuiz;

    @NotBlank(message = "idStudent khong duoc de trong")
    private String idStudent;

    private Integer attemptNumber;

    private LocalDateTime startTime;

    private LocalDateTime finishedTime;

    private Float grade;
}
