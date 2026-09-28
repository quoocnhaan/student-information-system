package com.example.demo.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionOptionResponse {
    private String idOption;
    private String idQuestion;
    private String answer;
    private Boolean correct;
}
