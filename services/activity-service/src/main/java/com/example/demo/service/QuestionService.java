package com.example.demo.service;

import com.example.demo.dto.request.QuestionRequest;
import com.example.demo.dto.response.QuestionResponse;
import com.example.demo.entity.Question;
import com.example.demo.entity.Quiz;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.QuestionMapper;
import com.example.demo.repository.QuestionRepository;
import com.example.demo.repository.QuizRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final QuizRepository quizRepository;
    private final QuestionMapper questionMapper;

    public QuestionResponse create(QuestionRequest request) {
        Quiz quiz = quizRepository.findById(request.getIdQuiz())
                .orElseThrow(() -> ResourceNotFoundException.of("Quiz", request.getIdQuiz()));

        Question entity = questionMapper.toEntity(request);
        entity.setIdQuestion(UUID.randomUUID().toString());
        entity.setQuiz(quiz);

        return questionMapper.toResponse(questionRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public QuestionResponse getById(String id) {
        Question entity = questionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Question", id));
        return questionMapper.toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<QuestionResponse> getAll() {
        return questionRepository.findAll().stream().map(questionMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<QuestionResponse> getByQuiz(String idQuiz) {
        return questionRepository.findByQuiz_IdQuiz(idQuiz).stream()
                .map(questionMapper::toResponse).toList();
    }

    public QuestionResponse update(String id, QuestionRequest request) {
        Question entity = questionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Question", id));

        Quiz quiz = quizRepository.findById(request.getIdQuiz())
                .orElseThrow(() -> ResourceNotFoundException.of("Quiz", request.getIdQuiz()));

        entity.setTitle(request.getTitle());
        entity.setQuiz(quiz);

        return questionMapper.toResponse(questionRepository.save(entity));
    }

    public void delete(String id) {
        if (!questionRepository.existsById(id)) {
            throw ResourceNotFoundException.of("Question", id);
        }
        questionRepository.deleteById(id);
    }
}
