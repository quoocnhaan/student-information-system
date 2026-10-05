package com.example.demo.mapper;

import com.example.demo.dto.request.StudentAnswerRequest;
import com.example.demo.dto.response.StudentAnswerResponse;
import com.example.demo.entity.StudentAnswer;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface StudentAnswerMapper {

    @Mapping(target = "idSa", ignore = true)
    @Mapping(target = "attempt", ignore = true)
    @Mapping(target = "question", ignore = true)
    @Mapping(target = "option", ignore = true)
    StudentAnswer toEntity(StudentAnswerRequest request);

    @Mapping(source = "attempt.idAttempt", target = "idAttempt")
    @Mapping(source = "question.idQuestion", target = "idQuestion")
    @Mapping(source = "option.idOption", target = "idOption")
    StudentAnswerResponse toResponse(StudentAnswer entity);
}
