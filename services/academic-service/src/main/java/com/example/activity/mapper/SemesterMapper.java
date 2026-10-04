package com.example.activity.mapper;

import com.example.activity.dto.request.SemesterRequest;
import com.example.activity.dto.response.SemesterResponse;
import com.example.activity.entity.Semester;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface SemesterMapper {

    SemesterResponse toResponse(Semester entity);

    Semester toEntity(SemesterRequest request);

    @Mapping(target = "semesterId", ignore = true)
    void updateEntity(SemesterRequest request, @MappingTarget Semester entity);
}
