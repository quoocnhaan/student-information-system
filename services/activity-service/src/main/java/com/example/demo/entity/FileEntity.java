package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "file")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileEntity {

    @Id
    @Column(name = "id_file", length = 50)
    private String idFile;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_activity", nullable = false)
    private Activity activity;

    @Column(name = "description")
    private String description;

    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;
}
