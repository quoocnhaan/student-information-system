package com.example.activity.mapper;

import com.example.activity.dto.request.CourseRequest;
import com.example.activity.dto.response.CourseResponse;
import com.example.activity.entity.Course;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CourseMapper {

    @Mapping(source = "major.majorId", target = "majorId")
    CourseResponse toResponse(Course entity);

    @Mapping(target = "major", ignore = true)
    Course toEntity(CourseRequest request);

    @Mapping(target = "idCourse", ignore = true)
    @Mapping(target = "major", ignore = true)
    void updateEntity(CourseRequest request, @MappingTarget Course entity);
}
