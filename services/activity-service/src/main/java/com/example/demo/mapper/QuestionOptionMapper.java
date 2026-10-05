package com.example.demo.mapper;

import com.example.demo.dto.request.QuestionOptionRequest;
import com.example.demo.dto.response.QuestionOptionResponse;
import com.example.demo.entity.QuestionOption;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface QuestionOptionMapper {

    @Mapping(target = "idOption", ignore = true)
    @Mapping(target = "question", ignore = true)
    QuestionOption toEntity(QuestionOptionRequest request);

    @Mapping(source = "question.idQuestion", target = "idQuestion")
    QuestionOptionResponse toResponse(QuestionOption entity);
}
