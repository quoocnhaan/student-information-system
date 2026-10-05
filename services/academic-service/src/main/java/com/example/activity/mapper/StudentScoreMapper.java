package com.example.activity.mapper;

import com.example.activity.dto.request.StudentScoreRequest;
import com.example.activity.dto.response.StudentScoreResponse;
import com.example.activity.entity.StudentScore;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface StudentScoreMapper {

    @Mapping(source = "gradeComponent.idGradeComponents", target = "idGradeComponents")
    @Mapping(source = "enrollment.enrollmentId", target = "enrollmentId")
    StudentScoreResponse toResponse(StudentScore entity);

    @Mapping(target = "gradeComponent", ignore = true)
    @Mapping(target = "enrollment", ignore = true)
    StudentScore toEntity(StudentScoreRequest request);

    @Mapping(target = "idScore", ignore = true)
    @Mapping(target = "gradeComponent", ignore = true)
    @Mapping(target = "enrollment", ignore = true)
    void updateEntity(StudentScoreRequest request, @MappingTarget StudentScore entity);
}
