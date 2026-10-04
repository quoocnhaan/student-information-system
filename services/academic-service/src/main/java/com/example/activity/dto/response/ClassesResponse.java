package com.example.activity.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ClassesResponse {

    private String idClasses;

    private String courseId;

    private String semesterId;

    private Integer capacity;

    private String status;

    private String room;

    private String lecturerId;

    private String day;
}
