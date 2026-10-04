package com.example.activity.mapper;

import com.example.activity.dto.request.FacultyRequest;
import com.example.activity.dto.response.FacultyResponse;
import com.example.activity.entity.Faculty;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface FacultyMapper {

    FacultyResponse toResponse(Faculty entity);

    Faculty toEntity(FacultyRequest request);

    @Mapping(target = "facultyId", ignore = true)
    void updateEntity(FacultyRequest request, @MappingTarget Faculty entity);
}
