package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "question")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Question {

    @Id
    @Column(name = "id_question", length = 50)
    private String idQuestion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_quiz", nullable = false)
    private Quiz quiz;

    @Column(name = "title", nullable = false, length = 500)
    private String title;
}
