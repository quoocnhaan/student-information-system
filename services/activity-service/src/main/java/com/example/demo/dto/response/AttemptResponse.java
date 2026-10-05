package com.example.demo.dto.response;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttemptResponse {
    private String idAttempt;
    private String idQuiz;
    private String idStudent;
    private Integer attemptNumber;
    private LocalDateTime startTime;
    private LocalDateTime finishedTime;
    private Float grade;
}
