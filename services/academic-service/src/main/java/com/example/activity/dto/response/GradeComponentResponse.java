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
public class GradeComponentResponse {

    private String idGradeComponents;

    private String name;

    private BigDecimal weightPercentage;
}
