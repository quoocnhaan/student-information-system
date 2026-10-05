package com.example.activity.mapper;

import com.example.activity.dto.request.ExamScheduleRequest;
import com.example.activity.dto.response.ExamScheduleResponse;
import com.example.activity.entity.ExamSchedule;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ExamScheduleMapper {

    @Mapping(source = "semester.semesterId", target = "semesterId")
    @Mapping(source = "classes.idClasses", target = "idClasses")
    ExamScheduleResponse toResponse(ExamSchedule entity);

    @Mapping(target = "semester", ignore = true)
    @Mapping(target = "classes", ignore = true)
    ExamSchedule toEntity(ExamScheduleRequest request);

    @Mapping(target = "examId", ignore = true)
    @Mapping(target = "semester", ignore = true)
    @Mapping(target = "classes", ignore = true)
    void updateEntity(ExamScheduleRequest request, @MappingTarget ExamSchedule entity);
}
