package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionRequest {

    @NotBlank(message = "idQuiz khong duoc de trong")
    @Size(max = 50, message = "idQuiz khong duoc vuot qua 50 ky tu")
    private String idQuiz;

    @NotBlank(message = "title khong duoc de trong")
    @Size(max = 500, message = "title khong duoc vuot qua 500 ky tu")
    private String title;
}
