package com.example.activity.dto.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SemesterResponse {

    private String semesterId;

    private String name;

    private LocalDate startDate;

    private LocalDate endDate;

    private String status;
}
