package com.example.activity.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Entity
@Table(name = "exam_student")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ExamStudent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_exam_student")
    private Integer idExamStudent;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "exam_id", nullable = false)
    private ExamSchedule examSchedule;

    @Column(name = "student_id", nullable = false, length = 50)
    private String studentId;

    @Column(name = "status", length = 50)
    private String status;
}
