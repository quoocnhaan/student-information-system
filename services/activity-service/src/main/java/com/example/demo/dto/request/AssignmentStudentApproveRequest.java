package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignmentStudentApproveRequest {

    @NotBlank(message = "idAssignment khong duoc de trong")
    @Size(max = 50, message = "idAssignment khong duoc vuot qua 50 ky tu")
    private String idAssignment;

    @NotBlank(message = "idStudent khong duoc de trong")
    @Size(max = 50, message = "idStudent khong duoc vuot qua 50 ky tu")
    private String idStudent;

    @Size(max = 255, message = "submitFile khong duoc vuot qua 255 ky tu")
    private String submitFile;
}
