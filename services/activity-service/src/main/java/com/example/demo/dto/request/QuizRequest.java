package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizRequest {

    @NotBlank(message = "idActivity khong duoc de trong")
    private String idActivity;

    private String description;

    /** Don vi: phut */
    private Integer duration;

    private Integer attemptsLimit;
}
