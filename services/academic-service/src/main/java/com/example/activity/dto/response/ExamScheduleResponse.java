package com.example.activity.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ExamScheduleResponse {

    private String examId;

    private String semesterId;

    private String idClasses;

    private String room;

    private LocalDateTime startTime;

    private LocalDateTime endTime;

    private Integer capacity;

    private String type;
}
