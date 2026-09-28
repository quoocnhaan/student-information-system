package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "assignment_student_approve")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignmentStudentApprove {

    @Id
    @Column(name = "id_assignment_student_approve", length = 50)
    private String idAssignmentStudentApprove;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_assignment", nullable = false)
    private Assignment assignment;

    // Tham chieu cheo service quan ly sinh vien -> khong co FK
    @Column(name = "id_student", nullable = false, length = 50)
    private String idStudent;

    @Column(name = "submit_file")
    private String submitFile;
}
