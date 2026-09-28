package com.example.activity.mapper;

import com.example.activity.dto.request.ClassesRequest;
import com.example.activity.dto.response.ClassesResponse;
import com.example.activity.entity.Classes;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ClassesMapper {

    @Mapping(source = "course.idCourse", target = "courseId")
    @Mapping(source = "semester.semesterId", target = "semesterId")
    ClassesResponse toResponse(Classes entity);

    @Mapping(target = "course", ignore = true)
    @Mapping(target = "semester", ignore = true)
    Classes toEntity(ClassesRequest request);

    @Mapping(target = "idClasses", ignore = true)
    @Mapping(target = "course", ignore = true)
    @Mapping(target = "semester", ignore = true)
    void updateEntity(ClassesRequest request, @MappingTarget Classes entity);
}
