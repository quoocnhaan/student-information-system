package com.example.activity.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ClassesGradeComponentId implements Serializable {

    @Column(name = "id_classes", length = 50)
    private String idClasses;

    @Column(name = "id_grade_components", length = 50)
    private String idGradeComponents;
}
