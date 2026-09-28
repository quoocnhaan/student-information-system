package com.example.activity.mapper;

import com.example.activity.dto.request.GradeComponentRequest;
import com.example.activity.dto.response.GradeComponentResponse;
import com.example.activity.entity.GradeComponent;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface GradeComponentMapper {

    GradeComponentResponse toResponse(GradeComponent entity);

    GradeComponent toEntity(GradeComponentRequest request);

    @Mapping(target = "idGradeComponents", ignore = true)
    void updateEntity(GradeComponentRequest request, @MappingTarget GradeComponent entity);
}
