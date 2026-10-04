package com.example.activity.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "student_scores")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StudentScore {

    @Id
    @Column(name = "id_score", length = 50)
    private String idScore;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_grade_components", nullable = false)
    private GradeComponent gradeComponent;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "enrollment_id", nullable = false)
    private StudentEnrollment enrollment;

    @Column(name = "score", precision = 5, scale = 2)
    private BigDecimal score;
}
