package com.example.demo.mapper;

import com.example.demo.dto.request.AssignmentRequest;
import com.example.demo.dto.response.AssignmentResponse;
import com.example.demo.entity.Assignment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AssignmentMapper {

    @Mapping(target = "idAssignment", ignore = true)
    @Mapping(target = "activity", ignore = true)
    Assignment toEntity(AssignmentRequest request);

    @Mapping(source = "activity.idActivity", target = "idActivity")
    AssignmentResponse toResponse(Assignment entity);
}
