package com.example.activity.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Entity
@Table(name = "classes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Classes {

    @Id
    @Column(name = "id_classes", length = 50)
    private String idClasses;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    @Column(name = "capacity")
    private Integer capacity;

    @Column(name = "status", length = 50)
    private String status;

    @Column(name = "Room", length = 50)
    private String room;

    @Column(name = "lecturer_id", length = 50)
    private String lecturerId;

    @Column(name = "Day", length = 50)
    private String day;
}
