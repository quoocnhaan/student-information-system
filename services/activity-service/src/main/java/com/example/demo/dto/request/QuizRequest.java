package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizRequest {

    @NotBlank(message = "idActivity khong duoc de trong")
    @Size(max = 50, message = "idActivity khong duoc vuot qua 50 ky tu")
    private String idActivity;

    @Size(max = 500, message = "description khong duoc vuot qua 500 ky tu")
    private String description;

    /** Don vi: phut */
    @Positive(message = "duration phai lon hon 0")
    private Integer duration;

    @Positive(message = "attemptsLimit phai lon hon 0")
    private Integer attemptsLimit;
}
