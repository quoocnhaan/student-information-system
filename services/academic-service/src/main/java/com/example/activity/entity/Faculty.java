package com.example.activity.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Entity
@Table(name = "faculties")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Faculty {

    @Id
    @Column(name = "faculty_id", length = 50)
    private String facultyId;

    @Column(name = "name", nullable = false, length = 255)
    private String name;
}
