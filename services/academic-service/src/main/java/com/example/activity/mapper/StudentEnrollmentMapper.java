package com.example.activity.mapper;

import com.example.activity.dto.request.StudentEnrollmentRequest;
import com.example.activity.dto.response.StudentEnrollmentResponse;
import com.example.activity.entity.StudentEnrollment;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface StudentEnrollmentMapper {

    @Mapping(source = "classes.idClasses", target = "idClasses")
    StudentEnrollmentResponse toResponse(StudentEnrollment entity);

    @Mapping(target = "classes", ignore = true)
    StudentEnrollment toEntity(StudentEnrollmentRequest request);

    @Mapping(target = "enrollmentId", ignore = true)
    @Mapping(target = "classes", ignore = true)
    void updateEntity(StudentEnrollmentRequest request, @MappingTarget StudentEnrollment entity);
}
