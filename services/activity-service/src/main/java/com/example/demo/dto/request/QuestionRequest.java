package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionRequest {

    @NotBlank(message = "idQuiz khong duoc de trong")
    private String idQuiz;

    @NotBlank(message = "title khong duoc de trong")
    private String title;
}
