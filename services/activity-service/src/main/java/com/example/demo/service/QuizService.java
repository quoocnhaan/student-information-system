package com.example.demo.service;

import com.example.demo.dto.request.QuizRequest;
import com.example.demo.dto.response.QuizResponse;
import com.example.demo.entity.Activity;
import com.example.demo.entity.Quiz;
import com.example.demo.exception.DuplicateResourceException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.QuizMapper;
import com.example.demo.repository.ActivityRepository;
import com.example.demo.repository.QuizRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class QuizService {

    private final QuizRepository quizRepository;
    private final ActivityRepository activityRepository;
    private final QuizMapper quizMapper;

    public QuizResponse create(QuizRequest request) {
        validateQuiz(request);
        Activity activity = activityRepository.findById(request.getIdActivity())
                .orElseThrow(() -> ResourceNotFoundException.of("Activity", request.getIdActivity()));

        // Ep quan he 1-1: 1 activity chi duoc gan voi 1 quiz
        quizRepository.findByActivity_IdActivity(request.getIdActivity())
                .ifPresent(q -> {
                    throw new DuplicateResourceException("Activity " + request.getIdActivity() + " da co quiz roi");
                });

        Quiz entity = quizMapper.toEntity(request);
        entity.setIdQuiz(UUID.randomUUID().toString());
        entity.setActivity(activity);

        return quizMapper.toResponse(quizRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public QuizResponse getById(String id) {
        Quiz entity = quizRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Quiz", id));
        return quizMapper.toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<QuizResponse> getAll() {
        return quizRepository.findAll().stream().map(quizMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public QuizResponse getByActivity(String idActivity) {
        Quiz entity = quizRepository.findByActivity_IdActivity(idActivity)
                .orElseThrow(() -> ResourceNotFoundException.of("Quiz (by activity)", idActivity));
        return quizMapper.toResponse(entity);
    }

    public QuizResponse update(String id, QuizRequest request) {
        validateQuiz(request);
        Quiz entity = quizRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Quiz", id));

        Activity activity = activityRepository.findById(request.getIdActivity())
                .orElseThrow(() -> ResourceNotFoundException.of("Activity", request.getIdActivity()));

        entity.setDescription(request.getDescription());
        entity.setDuration(request.getDuration());
        entity.setAttemptsLimit(request.getAttemptsLimit());
        entity.setActivity(activity);

        return quizMapper.toResponse(quizRepository.save(entity));
    }

    private void validateQuiz(QuizRequest request) {
        if (request.getDuration() != null && request.getDuration() <= 0) {
            throw new IllegalArgumentException("duration phai lon hon 0");
        }
        if (request.getAttemptsLimit() != null && request.getAttemptsLimit() <= 0) {
            throw new IllegalArgumentException("attemptsLimit phai lon hon 0");
        }
    }

    public void delete(String id) {
        if (!quizRepository.existsById(id)) {
            throw ResourceNotFoundException.of("Quiz", id);
        }
        quizRepository.deleteById(id);
    }
}
