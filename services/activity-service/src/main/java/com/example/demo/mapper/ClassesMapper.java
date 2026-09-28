package com.example.demo.mapper;

import com.example.demo.dto.request.ClassesRequest;
import com.example.demo.dto.response.ClassesResponse;
import com.example.demo.entity.Classes;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface ClassesMapper {

    Classes toEntity(ClassesRequest request);

    ClassesResponse toResponse(Classes entity);
}
