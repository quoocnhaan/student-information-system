package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "activity")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Activity {

    @Id
    @Column(name = "id_activity", length = 50)
    private String idActivity;

    @Column(name = "name", nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_section", nullable = false)
    private Section section;

    @Column(name = "type", nullable = false, length = 50)
    private String type;

    @Column(name = "time_open")
    private LocalDate timeOpen;

    @Column(name = "time_close")
    private LocalDate timeClose;
}
