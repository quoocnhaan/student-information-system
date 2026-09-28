package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignmentStudentApproveRequest {

    @NotBlank(message = "idAssignment khong duoc de trong")
    private String idAssignment;

    @NotBlank(message = "idStudent khong duoc de trong")
    private String idStudent;

    private String submitFile;
}
