package com.example.demo.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionResponse {
    private String idQuestion;
    private String idQuiz;
    private String title;
}
