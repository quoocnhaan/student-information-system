package com.example.activity.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "student_enrollments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StudentEnrollment {

    @Id
    @Column(name = "enrollment_id", length = 50)
    private String enrollmentId;

    @Column(name = "student_id", nullable = false, length = 50)
    private String studentId;

    @Column(name = "enrollment_status", length = 50)
    private String enrollmentStatus;

    @Column(name = "final_score", precision = 5, scale = 2)
    private BigDecimal finalScore;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_classes", nullable = false)
    private Classes classes;

    @Column(name = "letter_grade", length = 10)
    private String letterGrade;

    @Column(name = "is_passed")
    private Boolean isPassed;
}
