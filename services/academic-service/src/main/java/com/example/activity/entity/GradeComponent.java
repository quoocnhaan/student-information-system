package com.example.activity.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "grade_components")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GradeComponent {

    @Id
    @Column(name = "id_grade_components", length = 50)
    private String idGradeComponents;

    @Column(name = "name", nullable = false, length = 100)
    private String name;

    @Column(name = "weight_percentage", nullable = false, precision = 5, scale = 2)
    private BigDecimal weightPercentage;
}
