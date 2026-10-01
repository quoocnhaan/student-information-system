package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentAnswerRequest {

    @NotBlank(message = "idAttempt khong duoc de trong")
    @Size(max = 50, message = "idAttempt khong duoc vuot qua 50 ky tu")
    private String idAttempt;

    @NotBlank(message = "idQuestion khong duoc de trong")
    @Size(max = 50, message = "idQuestion khong duoc vuot qua 50 ky tu")
    private String idQuestion;

    /** Co the null neu cau hoi tu luan */
    @Size(max = 50, message = "idOption khong duoc vuot qua 50 ky tu")
    private String idOption;
}
