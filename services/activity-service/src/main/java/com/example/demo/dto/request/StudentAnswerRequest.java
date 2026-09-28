package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentAnswerRequest {

    @NotBlank(message = "idAttempt khong duoc de trong")
    private String idAttempt;

    @NotBlank(message = "idQuestion khong duoc de trong")
    private String idQuestion;

    /** Co the null neu cau hoi tu luan */
    private String idOption;
}
