package com.example.activity.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "classes_grade_components")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ClassesGradeComponent {

    @EmbeddedId
    private ClassesGradeComponentId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("idClasses")
    @JoinColumn(name = "id_classes", nullable = false)
    private Classes classes;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("idGradeComponents")
    @JoinColumn(name = "id_grade_components", nullable = false)
    private GradeComponent gradeComponent;
}
