package com.example.demo.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentAnswerResponse {
    private String idSa;
    private String idAttempt;
    private String idQuestion;
    private String idOption;
}
