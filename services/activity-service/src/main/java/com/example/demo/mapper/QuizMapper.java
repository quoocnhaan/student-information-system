package com.example.demo.mapper;

import com.example.demo.dto.request.QuizRequest;
import com.example.demo.dto.response.QuizResponse;
import com.example.demo.entity.Quiz;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface QuizMapper {

    @Mapping(target = "idQuiz", ignore = true)
    @Mapping(target = "activity", ignore = true)
    Quiz toEntity(QuizRequest request);

    @Mapping(source = "activity.idActivity", target = "idActivity")
    QuizResponse toResponse(Quiz entity);
}
