package com.example.demo.mapper;

import com.example.demo.dto.request.QuestionRequest;
import com.example.demo.dto.response.QuestionResponse;
import com.example.demo.entity.Question;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface QuestionMapper {

    @Mapping(target = "idQuestion", ignore = true)
    @Mapping(target = "quiz", ignore = true)
    Question toEntity(QuestionRequest request);

    @Mapping(source = "quiz.idQuiz", target = "idQuiz")
    QuestionResponse toResponse(Question entity);
}
