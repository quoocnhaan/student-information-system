package com.example.activity.mapper;

import com.example.activity.dto.request.ExamStudentRequest;
import com.example.activity.dto.response.ExamStudentResponse;
import com.example.activity.entity.ExamStudent;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ExamStudentMapper {

    @Mapping(source = "examSchedule.examId", target = "examId")
    ExamStudentResponse toResponse(ExamStudent entity);

    @Mapping(target = "idExamStudent", ignore = true)
    @Mapping(target = "examSchedule", ignore = true)
    ExamStudent toEntity(ExamStudentRequest request);

    @Mapping(target = "idExamStudent", ignore = true)
    @Mapping(target = "examSchedule", ignore = true)
    void updateEntity(ExamStudentRequest request, @MappingTarget ExamStudent entity);
}
