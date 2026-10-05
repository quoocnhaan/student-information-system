package com.example.activity.mapper;

import com.example.activity.dto.response.ClassesGradeComponentResponse;
import com.example.activity.entity.ClassesGradeComponent;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ClassesGradeComponentMapper {

    @Mapping(source = "classes.idClasses", target = "idClasses")
    @Mapping(source = "gradeComponent.idGradeComponents", target = "idGradeComponents")
    ClassesGradeComponentResponse toResponse(ClassesGradeComponent entity);
}
