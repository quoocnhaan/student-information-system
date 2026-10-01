package com.example.demo.service;

import com.example.demo.dto.request.AttemptRequest;
import com.example.demo.dto.response.AttemptResponse;
import com.example.demo.entity.Attempt;
import com.example.demo.entity.Question;
import com.example.demo.entity.Quiz;
import com.example.demo.entity.StudentAnswer;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.AttemptMapper;
import com.example.demo.repository.AttemptRepository;
import com.example.demo.repository.QuestionRepository;
import com.example.demo.repository.QuizRepository;
import com.example.demo.repository.StudentAnswerRepository;
import lombok.RequiredArgsConstructor;
import com.example.demo.security.SecurityUtils;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AttemptService {

    private final AttemptRepository attemptRepository;
    private final QuizRepository quizRepository;
    private final QuestionRepository questionRepository;
    private final StudentAnswerRepository studentAnswerRepository;
    private final AttemptMapper attemptMapper;

    public AttemptResponse create(AttemptRequest request) {
        if (SecurityUtils.isCurrentUserStudent()) {
            String currentUsername = SecurityUtils.getCurrentUsername();
            if (request.getIdStudent() != null && !request.getIdStudent().isBlank() && !request.getIdStudent().equals(currentUsername)) {
                throw new AccessDeniedException("Access Denied: You cannot create attempt for another student");
            }
            if (request.getIdStudent() == null || request.getIdStudent().isBlank()) {
                request.setIdStudent(currentUsername);
            }
        }

        Quiz quiz = quizRepository.findById(request.getIdQuiz())
                .orElseThrow(() -> ResourceNotFoundException.of("Quiz", request.getIdQuiz()));

        long currentAttempts = attemptRepository.countByQuiz_IdQuizAndIdStudent(request.getIdQuiz(), request.getIdStudent());
        if (quiz.getAttemptsLimit() != null && quiz.getAttemptsLimit() > 0 && currentAttempts >= quiz.getAttemptsLimit()) {
            throw new IllegalArgumentException("Sinh viên đã đạt giới hạn số lần làm bài (" + quiz.getAttemptsLimit() + ")");
        }

        validateGrade(request.getGrade());
        Attempt entity = attemptMapper.toEntity(request);
        entity.setIdAttempt(UUID.randomUUID().toString());
        entity.setQuiz(quiz);
        entity.setAttemptNumber((int) currentAttempts + 1);
        if (entity.getStartTime() == null) {
            entity.setStartTime(LocalDateTime.now());
        }
        validateTimes(entity.getStartTime(), entity.getFinishedTime());

        // Student cannot pre-set grade at attempt creation
        if (SecurityUtils.isCurrentUserStudent() || (!SecurityUtils.isCurrentUserAdmin() && !SecurityUtils.isCurrentUserLecturer())) {
            entity.setGrade(null);
        }

        return attemptMapper.toResponse(attemptRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public AttemptResponse getById(String id) {
        Attempt entity = attemptRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Attempt", id));
        SecurityUtils.checkStudentAccess(entity.getIdStudent(), "view attempt");
        return attemptMapper.toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<AttemptResponse> getAll() {
        if (SecurityUtils.isCurrentUserStudent()) {
            return attemptRepository.findByIdStudent(SecurityUtils.getCurrentUsername()).stream()
                    .map(attemptMapper::toResponse)
                    .toList();
        }
        return attemptRepository.findAll().stream().map(attemptMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AttemptResponse> getByQuiz(String idQuiz) {
        if (SecurityUtils.isCurrentUserStudent()) {
            return attemptRepository.findByQuiz_IdQuizAndIdStudent(idQuiz, SecurityUtils.getCurrentUsername()).stream()
                    .map(attemptMapper::toResponse).toList();
        }
        return attemptRepository.findByQuiz_IdQuiz(idQuiz).stream()
                .map(attemptMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AttemptResponse> getByStudent(String idStudent) {
        SecurityUtils.checkStudentAccess(idStudent, "view attempts");
        return attemptRepository.findByIdStudent(idStudent).stream()
                .map(attemptMapper::toResponse).toList();
    }

    public AttemptResponse update(String id, AttemptRequest request) {
        validateGrade(request.getGrade());
        Attempt entity = attemptRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Attempt", id));
        SecurityUtils.checkStudentAccess(entity.getIdStudent(), "update attempt");
        if (SecurityUtils.isCurrentUserStudent()) {
            SecurityUtils.checkStudentAccess(request.getIdStudent(), "update attempt");
        }

        Quiz quiz = quizRepository.findById(request.getIdQuiz())
                .orElseThrow(() -> ResourceNotFoundException.of("Quiz", request.getIdQuiz()));

        if (request.getIdStudent() != null && !request.getIdStudent().isBlank()) {
            entity.setIdStudent(request.getIdStudent());
        }
        if (request.getAttemptNumber() != null) {
            entity.setAttemptNumber(request.getAttemptNumber());
        }
        if (request.getStartTime() != null) {
            entity.setStartTime(request.getStartTime());
        }
        if (request.getFinishedTime() != null) {
            entity.setFinishedTime(request.getFinishedTime());
        }
        validateTimes(entity.getStartTime(), entity.getFinishedTime());
        entity.setQuiz(quiz);

        if (SecurityUtils.isCurrentUserStudent()) {
            // Student cannot assign grade manually; calculate grade from student answers on finish
            if (entity.getFinishedTime() != null) {
                entity.setGrade(calculateGrade(id, quiz.getIdQuiz()));
            } else {
                entity.setGrade(null);
            }
        } else {
            // Admin, Lecturer, or manual grading
            if (request.getGrade() != null) {
                entity.setGrade(request.getGrade());
            } else if (entity.getFinishedTime() != null) {
                entity.setGrade(calculateGrade(id, quiz.getIdQuiz()));
            }
        }

        return attemptMapper.toResponse(attemptRepository.save(entity));
    }

    public AttemptResponse updateGrade(String id, Float grade) {
        validateGrade(grade);
        Attempt entity = attemptRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Attempt", id));
        entity.setGrade(grade);
        return attemptMapper.toResponse(attemptRepository.save(entity));
    }

    private void validateTimes(LocalDateTime start, LocalDateTime finish) {
        if (start != null && finish != null && finish.isBefore(start)) {
            throw new IllegalArgumentException("finishedTime phai sau hoac bang startTime");
        }
    }

    private void validateGrade(Float grade) {
        if (grade != null && (grade < 0.0f || grade > 10.0f)) {
            throw new IllegalArgumentException("grade phai trong khoang tu 0.0 den 10.0");
        }
    }

    private Float calculateGrade(String idAttempt, String idQuiz) {
        List<Question> questions = questionRepository.findByQuiz_IdQuiz(idQuiz);
        if (questions == null || questions.isEmpty()) {
            return 0.0f;
        }

        List<StudentAnswer> answers = studentAnswerRepository.findByAttempt_IdAttempt(idAttempt);
        if (answers == null || answers.isEmpty()) {
            return 0.0f;
        }

        Set<String> correctQuestionIds = new HashSet<>();
        for (StudentAnswer sa : answers) {
            if (sa.getQuestion() != null && sa.getOption() != null && Boolean.TRUE.equals(sa.getOption().getCorrect())) {
                correctQuestionIds.add(sa.getQuestion().getIdQuestion());
            }
        }

        double rawGrade = ((double) correctQuestionIds.size() / questions.size()) * 10.0;
        return (float) (Math.round(rawGrade * 100.0) / 100.0);
    }

    public void delete(String id) {
        if (!attemptRepository.existsById(id)) {
            throw ResourceNotFoundException.of("Attempt", id);
        }
        attemptRepository.deleteById(id);
    }
}
