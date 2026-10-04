package com.example.activity.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CourseResponse {

    private String idCourse;

    private String majorId;

    private String name;

    private Integer credits;
}
