package com.example.demo.mapper;

import com.example.demo.dto.request.ActivityRequest;
import com.example.demo.dto.response.ActivityResponse;
import com.example.demo.entity.Activity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ActivityMapper {

    @Mapping(target = "idActivity", ignore = true)
    @Mapping(target = "section", ignore = true)
    Activity toEntity(ActivityRequest request);

    @Mapping(source = "section.idSection", target = "idSection")
    ActivityResponse toResponse(Activity entity);
}
