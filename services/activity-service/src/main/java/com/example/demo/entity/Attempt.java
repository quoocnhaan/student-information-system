package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Bang "Attempts" trong schema goc.
 */
@Entity
@Table(name = "Attempts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attempt {

    @Id
    @Column(name = "id_attempt", length = 50)
    private String idAttempt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_quiz", nullable = false)
    private Quiz quiz;

    // Tham chieu cheo service quan ly sinh vien -> khong co FK
    @Column(name = "id_student", nullable = false, length = 50)
    private String idStudent;

    @Column(name = "attempt_Number")
    private Integer attemptNumber;

    @Column(name = "start_time")
    private LocalDateTime startTime;

    @Column(name = "finished_time")
    private LocalDateTime finishedTime;

    @Column(name = "grade")
    private Float grade;
}
