package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignmentRequest {

    @NotBlank(message = "name khong duoc de trong")
    @Size(max = 255, message = "name khong duoc vuot qua 255 ky tu")
    private String name;

    @Size(max = 255, message = "fileTeacher khong duoc vuot qua 255 ky tu")
    private String fileTeacher;

    @NotBlank(message = "idActivity khong duoc de trong")
    @Size(max = 50, message = "idActivity khong duoc vuot qua 50 ky tu")
    private String idActivity;

    @Size(max = 500, message = "description khong duoc vuot qua 500 ky tu")
    private String description;
}
