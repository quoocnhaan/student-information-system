package com.example.demo.mapper;

import com.example.demo.dto.request.SectionRequest;
import com.example.demo.dto.response.SectionResponse;
import com.example.demo.entity.Section;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface SectionMapper {

    @Mapping(target = "idSection", ignore = true)
    @Mapping(target = "classes", ignore = true)
    Section toEntity(SectionRequest request);

    @Mapping(source = "classes.idClasses", target = "idClasses")
    SectionResponse toResponse(Section entity);
}
