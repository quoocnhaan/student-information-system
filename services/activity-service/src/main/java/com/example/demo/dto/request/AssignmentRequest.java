package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignmentRequest {

    @NotBlank(message = "name khong duoc de trong")
    private String name;

    private String fileTeacher;

    @NotBlank(message = "idActivity khong duoc de trong")
    private String idActivity;

    private String description;
}
