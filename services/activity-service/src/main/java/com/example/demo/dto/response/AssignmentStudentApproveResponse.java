package com.example.demo.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignmentStudentApproveResponse {
    private String idAssignmentStudentApprove;
    private String idAssignment;
    private String idStudent;
    private String submitFile;
}
