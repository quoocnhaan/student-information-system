package com.example.demo.mapper;

import com.example.demo.dto.request.AssignmentStudentApproveRequest;
import com.example.demo.dto.response.AssignmentStudentApproveResponse;
import com.example.demo.entity.AssignmentStudentApprove;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AssignmentStudentApproveMapper {

    @Mapping(target = "idAssignmentStudentApprove", ignore = true)
    @Mapping(target = "assignment", ignore = true)
    AssignmentStudentApprove toEntity(AssignmentStudentApproveRequest request);

    @Mapping(source = "assignment.idAssignment", target = "idAssignment")
    AssignmentStudentApproveResponse toResponse(AssignmentStudentApprove entity);
}
