package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "assignment")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Assignment {

    @Id
    @Column(name = "id_assignment", length = 50)
    private String idAssignment;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "file_teacher")
    private String fileTeacher;

    // Quan he 1-1 voi Activity
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_activity", nullable = false, unique = true)
    private Activity activity;

    @Column(name = "description", length = 500)
    private String description;
}
