package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Bang "option" trong schema goc.
 * Doi ten class thanh QuestionOption de tranh nham lan trong code Java,
 * nhung van map dung ten bang vat ly "option".
 */
@Entity
@Table(name = "options")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuestionOption {

    @Id
    @Column(name = "id_option", length = 50)
    private String idOption;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_question", nullable = false)
    private Question question;

    @Column(name = "answer", nullable = false, length = 500)
    private String answer;

    @Column(name = "correct", nullable = false)
    private Boolean correct;
}
