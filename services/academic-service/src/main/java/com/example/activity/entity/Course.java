package com.example.activity.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Entity
@Table(name = "courses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Course {

    @Id
    @Column(name = "id_course", length = 50)
    private String idCourse;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "major_id", nullable = false)
    private Major major;

    @Column(name = "name", nullable = false, length = 255)
    private String name;

    @Column(name = "credits", nullable = false)
    private Integer credits;
}
