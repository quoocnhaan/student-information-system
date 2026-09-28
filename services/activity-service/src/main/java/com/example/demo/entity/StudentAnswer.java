package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "student_answer")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentAnswer {

    @Id
    @Column(name = "id_sa", length = 50)
    private String idSa;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_attempt", nullable = false)
    private Attempt attempt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_question", nullable = false)
    private Question question;

    // Nullable: cau hoi tu luan khong co lua chon
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_option")
    private QuestionOption option;
}
