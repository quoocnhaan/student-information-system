package com.example.demo.service;

import com.example.demo.dto.request.AttemptRequest;
import com.example.demo.dto.response.AttemptResponse;
import com.example.demo.entity.Attempt;
import com.example.demo.entity.Quiz;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.AttemptMapper;
import com.example.demo.repository.AttemptRepository;
import com.example.demo.repository.QuizRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AttemptService {

    private final AttemptRepository attemptRepository;
    private final QuizRepository quizRepository;
    private final AttemptMapper attemptMapper;

    public AttemptResponse create(AttemptRequest request) {
        Quiz quiz = quizRepository.findById(request.getIdQuiz())
                .orElseThrow(() -> ResourceNotFoundException.of("Quiz", request.getIdQuiz()));

        Attempt entity = attemptMapper.toEntity(request);
        entity.setIdAttempt(UUID.randomUUID().toString());
        entity.setQuiz(quiz);

        return attemptMapper.toResponse(attemptRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public AttemptResponse getById(String id) {
        Attempt entity = attemptRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Attempt", id));
        return attemptMapper.toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<AttemptResponse> getAll() {
        return attemptRepository.findAll().stream().map(attemptMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AttemptResponse> getByQuiz(String idQuiz) {
        return attemptRepository.findByQuiz_IdQuiz(idQuiz).stream()
                .map(attemptMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AttemptResponse> getByStudent(String idStudent) {
        return attemptRepository.findByIdStudent(idStudent).stream()
                .map(attemptMapper::toResponse).toList();
    }

    public AttemptResponse update(String id, AttemptRequest request) {
        Attempt entity = attemptRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Attempt", id));

        Quiz quiz = quizRepository.findById(request.getIdQuiz())
                .orElseThrow(() -> ResourceNotFoundException.of("Quiz", request.getIdQuiz()));

        entity.setIdStudent(request.getIdStudent());
        entity.setAttemptNumber(request.getAttemptNumber());
        entity.setStartTime(request.getStartTime());
        entity.setFinishedTime(request.getFinishedTime());
        entity.setGrade(request.getGrade());
        entity.setQuiz(quiz);

        return attemptMapper.toResponse(attemptRepository.save(entity));
    }

    public void delete(String id) {
        if (!attemptRepository.existsById(id)) {
            throw ResourceNotFoundException.of("Attempt", id);
        }
        attemptRepository.deleteById(id);
    }
}
