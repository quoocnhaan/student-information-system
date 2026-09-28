package com.example.activity.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ExamStudentResponse {

    private Integer idExamStudent;

    private String examId;

    private String studentId;

    private String status;
}
