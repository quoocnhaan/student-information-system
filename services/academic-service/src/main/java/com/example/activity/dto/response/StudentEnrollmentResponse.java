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
public class StudentEnrollmentResponse {

    private String enrollmentId;

    private String studentId;

    private String enrollmentStatus;

    private BigDecimal finalScore;

    private String idClasses;

    private String letterGrade;

    private Boolean isPassed;
}
