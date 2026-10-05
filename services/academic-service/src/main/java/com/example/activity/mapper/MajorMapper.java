package com.example.activity.mapper;

import com.example.activity.dto.request.MajorRequest;
import com.example.activity.dto.response.MajorResponse;
import com.example.activity.entity.Major;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface MajorMapper {

    @Mapping(source = "faculty.facultyId", target = "facultyId")
    MajorResponse toResponse(Major entity);

    @Mapping(target = "faculty", ignore = true)
    Major toEntity(MajorRequest request);

    @Mapping(target = "majorId", ignore = true)
    @Mapping(target = "faculty", ignore = true)
    void updateEntity(MajorRequest request, @MappingTarget Major entity);
}
