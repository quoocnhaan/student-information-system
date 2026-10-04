package com.example.demo.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttemptRequest {

    @NotBlank(message = "idQuiz khong duoc de trong")
    @Size(max = 50, message = "idQuiz khong duoc vuot qua 50 ky tu")
    private String idQuiz;

    @NotBlank(message = "idStudent khong duoc de trong")
    @Size(max = 50, message = "idStudent khong duoc vuot qua 50 ky tu")
    private String idStudent;

    @Positive(message = "attemptNumber phai lon hon 0")
    private Integer attemptNumber;

    private LocalDateTime startTime;

    private LocalDateTime finishedTime;

    @DecimalMin(value = "0.0", message = "grade phai tu 0.0 tro len")
    @DecimalMax(value = "10.0", message = "grade khong duoc vuot qua 10.0")
    private Float grade;
}
