package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionOptionRequest {

    @NotBlank(message = "idQuestion khong duoc de trong")
    private String idQuestion;

    @NotBlank(message = "answer khong duoc de trong")
    private String answer;

    @NotNull(message = "correct khong duoc de trong")
    private Boolean correct;
}
