package com.example.demo.service;

import com.example.demo.dto.request.StudentAnswerRequest;
import com.example.demo.dto.response.StudentAnswerResponse;
import com.example.demo.entity.Attempt;
import com.example.demo.entity.Question;
import com.example.demo.entity.QuestionOption;
import com.example.demo.entity.StudentAnswer;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.StudentAnswerMapper;
import com.example.demo.repository.AttemptRepository;
import com.example.demo.repository.QuestionOptionRepository;
import com.example.demo.repository.QuestionRepository;
import com.example.demo.repository.StudentAnswerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class StudentAnswerService {

    private final StudentAnswerRepository studentAnswerRepository;
    private final AttemptRepository attemptRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final StudentAnswerMapper studentAnswerMapper;

    public StudentAnswerResponse create(StudentAnswerRequest request) {
        Attempt attempt = attemptRepository.findById(request.getIdAttempt())
                .orElseThrow(() -> ResourceNotFoundException.of("Attempt", request.getIdAttempt()));

        Question question = questionRepository.findById(request.getIdQuestion())
                .orElseThrow(() -> ResourceNotFoundException.of("Question", request.getIdQuestion()));

        // id_option co the null (cau hoi tu luan)
        QuestionOption option = null;
        if (request.getIdOption() != null && !request.getIdOption().isBlank()) {
            option = questionOptionRepository.findById(request.getIdOption())
                    .orElseThrow(() -> ResourceNotFoundException.of("QuestionOption", request.getIdOption()));
        }

        StudentAnswer entity = studentAnswerMapper.toEntity(request);
        entity.setIdSa(UUID.randomUUID().toString());
        entity.setAttempt(attempt);
        entity.setQuestion(question);
        entity.setOption(option);

        return studentAnswerMapper.toResponse(studentAnswerRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public StudentAnswerResponse getById(String id) {
        StudentAnswer entity = studentAnswerRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("StudentAnswer", id));
        return studentAnswerMapper.toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<StudentAnswerResponse> getAll() {
        return studentAnswerRepository.findAll().stream().map(studentAnswerMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<StudentAnswerResponse> getByAttempt(String idAttempt) {
        return studentAnswerRepository.findByAttempt_IdAttempt(idAttempt).stream()
                .map(studentAnswerMapper::toResponse).toList();
    }

    public StudentAnswerResponse update(String id, StudentAnswerRequest request) {
        StudentAnswer entity = studentAnswerRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("StudentAnswer", id));

        Attempt attempt = attemptRepository.findById(request.getIdAttempt())
                .orElseThrow(() -> ResourceNotFoundException.of("Attempt", request.getIdAttempt()));

        Question question = questionRepository.findById(request.getIdQuestion())
                .orElseThrow(() -> ResourceNotFoundException.of("Question", request.getIdQuestion()));

        QuestionOption option = null;
        if (request.getIdOption() != null && !request.getIdOption().isBlank()) {
            option = questionOptionRepository.findById(request.getIdOption())
                    .orElseThrow(() -> ResourceNotFoundException.of("QuestionOption", request.getIdOption()));
        }

        entity.setAttempt(attempt);
        entity.setQuestion(question);
        entity.setOption(option);

        return studentAnswerMapper.toResponse(studentAnswerRepository.save(entity));
    }

    public void delete(String id) {
        if (!studentAnswerRepository.existsById(id)) {
            throw ResourceNotFoundException.of("StudentAnswer", id);
        }
        studentAnswerRepository.deleteById(id);
    }
}
