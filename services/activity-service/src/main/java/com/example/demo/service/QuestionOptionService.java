package com.example.demo.service;

import com.example.demo.dto.request.QuestionOptionRequest;
import com.example.demo.dto.response.QuestionOptionResponse;
import com.example.demo.entity.Question;
import com.example.demo.entity.QuestionOption;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.QuestionOptionMapper;
import com.example.demo.repository.QuestionOptionRepository;
import com.example.demo.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class QuestionOptionService {

    private final QuestionOptionRepository questionOptionRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionMapper questionOptionMapper;

    public QuestionOptionResponse create(QuestionOptionRequest request) {
        Question question = questionRepository.findById(request.getIdQuestion())
                .orElseThrow(() -> ResourceNotFoundException.of("Question", request.getIdQuestion()));

        QuestionOption entity = questionOptionMapper.toEntity(request);
        entity.setIdOption(UUID.randomUUID().toString());
        entity.setQuestion(question);

        return questionOptionMapper.toResponse(questionOptionRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public QuestionOptionResponse getById(String id) {
        QuestionOption entity = questionOptionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("QuestionOption", id));
        return questionOptionMapper.toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<QuestionOptionResponse> getAll() {
        return questionOptionRepository.findAll().stream().map(questionOptionMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<QuestionOptionResponse> getByQuestion(String idQuestion) {
        return questionOptionRepository.findByQuestion_IdQuestion(idQuestion).stream()
                .map(questionOptionMapper::toResponse).toList();
    }

    public QuestionOptionResponse update(String id, QuestionOptionRequest request) {
        QuestionOption entity = questionOptionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("QuestionOption", id));

        Question question = questionRepository.findById(request.getIdQuestion())
                .orElseThrow(() -> ResourceNotFoundException.of("Question", request.getIdQuestion()));

        entity.setAnswer(request.getAnswer());
        entity.setCorrect(request.getCorrect());
        entity.setQuestion(question);

        return questionOptionMapper.toResponse(questionOptionRepository.save(entity));
    }

    public void delete(String id) {
        if (!questionOptionRepository.existsById(id)) {
            throw ResourceNotFoundException.of("QuestionOption", id);
        }
        questionOptionRepository.deleteById(id);
    }
}
