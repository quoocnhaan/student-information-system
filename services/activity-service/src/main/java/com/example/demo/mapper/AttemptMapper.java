package com.example.demo.mapper;

import com.example.demo.dto.request.AttemptRequest;
import com.example.demo.dto.response.AttemptResponse;
import com.example.demo.entity.Attempt;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface AttemptMapper {

    @Mapping(target = "idAttempt", ignore = true)
    @Mapping(target = "quiz", ignore = true)
    Attempt toEntity(AttemptRequest request);

    @Mapping(source = "quiz.idQuiz", target = "idQuiz")
    AttemptResponse toResponse(Attempt entity);
}
