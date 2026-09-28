package com.example.demo.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AssignmentResponse {
    private String idAssignment;
    private String name;
    private String fileTeacher;
    private String idActivity;
    private String description;
}
