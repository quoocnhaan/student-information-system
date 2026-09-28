package com.example.demo.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizResponse {
    private String idQuiz;
    private String idActivity;
    private String description;
    private Integer duration;
    private Integer attemptsLimit;
}
