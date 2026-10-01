package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionOptionRequest {

    @NotBlank(message = "idQuestion khong duoc de trong")
    @Size(max = 50, message = "idQuestion khong duoc vuot qua 50 ky tu")
    private String idQuestion;

    @NotBlank(message = "answer khong duoc de trong")
    @Size(max = 500, message = "answer khong duoc vuot qua 500 ky tu")
    private String answer;

    @NotNull(message = "correct khong duoc de trong")
    private Boolean correct;
}
