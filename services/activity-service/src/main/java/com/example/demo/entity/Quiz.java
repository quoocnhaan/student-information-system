package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "quiz")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Quiz {

    @Id
    @Column(name = "id_quiz", length = 50)
    private String idQuiz;

    // Quan he 1-1 voi Activity
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_activity", nullable = false, unique = true)
    private Activity activity;

    @Column(name = "description", length = 500)
    private String description;

    /** Don vi: phut */
    @Column(name = "duration")
    private Integer duration;

    @Column(name = "attemptsLimit")
    private Integer attemptsLimit;
}
