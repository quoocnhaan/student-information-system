package com.example.activity.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StudentScoreResponse {

    private String idScore;

    private String idGradeComponents;

    private String enrollmentId;

    private BigDecimal score;
}
