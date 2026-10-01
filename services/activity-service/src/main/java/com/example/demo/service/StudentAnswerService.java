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
import com.example.demo.security.SecurityUtils;
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
        SecurityUtils.checkStudentAccess(attempt.getIdStudent(), "submit answer");

        if (attempt.getFinishedTime() != null) {
            throw new IllegalArgumentException("Lượt làm bài đã kết thúc, không thể gửi câu trả lời");
        }

        Question question = questionRepository.findById(request.getIdQuestion())
                .orElseThrow(() -> ResourceNotFoundException.of("Question", request.getIdQuestion()));

        // V-176: Kiem tra cau hoi co thuoc bai trac nghiem cua luot lam bai khong
        if (question.getQuiz() == null || attempt.getQuiz() == null ||
                !question.getQuiz().getIdQuiz().equals(attempt.getQuiz().getIdQuiz())) {
            throw new IllegalArgumentException("Câu hỏi không thuộc về bài trắc nghiệm của lượt làm bài này");
        }

        // V-177: Kiem tra da ton tai cau tra loi cho cau hoi nay trong luot lam bai chua
        if (studentAnswerRepository.existsByAttempt_IdAttemptAndQuestion_IdQuestion(attempt.getIdAttempt(), question.getIdQuestion())) {
            throw new IllegalArgumentException("Câu hỏi này đã được trả lời trong lượt làm bài");
        }

        // id_option co the null (cau hoi tu luan)
        QuestionOption option = null;
        if (request.getIdOption() != null && !request.getIdOption().isBlank()) {
            option = questionOptionRepository.findById(request.getIdOption())
                    .orElseThrow(() -> ResourceNotFoundException.of("QuestionOption", request.getIdOption()));

            // V-175: Kiem tra dap an co thuoc ve cau hoi khong
            if (option.getQuestion() == null || !option.getQuestion().getIdQuestion().equals(question.getIdQuestion())) {
                throw new IllegalArgumentException("Đáp án không thuộc về câu hỏi được chọn");
            }
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
        if (entity.getAttempt() != null) {
            SecurityUtils.checkStudentAccess(entity.getAttempt().getIdStudent(), "view answer");
        }
        return studentAnswerMapper.toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<StudentAnswerResponse> getAll() {
        if (SecurityUtils.isCurrentUserStudent()) {
            return studentAnswerRepository.findByAttempt_IdStudent(SecurityUtils.getCurrentUsername()).stream()
                    .map(studentAnswerMapper::toResponse).toList();
        }
        return studentAnswerRepository.findAll().stream().map(studentAnswerMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<StudentAnswerResponse> getByAttempt(String idAttempt) {
        Attempt attempt = attemptRepository.findById(idAttempt)
                .orElseThrow(() -> ResourceNotFoundException.of("Attempt", idAttempt));
        SecurityUtils.checkStudentAccess(attempt.getIdStudent(), "view answers");
        return studentAnswerRepository.findByAttempt_IdAttempt(idAttempt).stream()
                .map(studentAnswerMapper::toResponse).toList();
    }

    public StudentAnswerResponse update(String id, StudentAnswerRequest request) {
        StudentAnswer entity = studentAnswerRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("StudentAnswer", id));
        if (entity.getAttempt() != null) {
            SecurityUtils.checkStudentAccess(entity.getAttempt().getIdStudent(), "update answer");
        }

        Attempt attempt = attemptRepository.findById(request.getIdAttempt())
                .orElseThrow(() -> ResourceNotFoundException.of("Attempt", request.getIdAttempt()));
        SecurityUtils.checkStudentAccess(attempt.getIdStudent(), "update answer");

        if (attempt.getFinishedTime() != null) {
            throw new IllegalArgumentException("Lượt làm bài đã kết thúc, không thể sửa câu trả lời");
        }

        Question question = questionRepository.findById(request.getIdQuestion())
                .orElseThrow(() -> ResourceNotFoundException.of("Question", request.getIdQuestion()));

        // V-176: Kiem tra cau hoi co thuoc bai trac nghiem cua luot lam bai khong
        if (question.getQuiz() == null || attempt.getQuiz() == null ||
                !question.getQuiz().getIdQuiz().equals(attempt.getQuiz().getIdQuiz())) {
            throw new IllegalArgumentException("Câu hỏi không thuộc về bài trắc nghiệm của lượt làm bài này");
        }

        // V-177: Kiem tra da ton tai cau tra loi khac cho cau hoi nay trong luot lam bai chua
        if (studentAnswerRepository.existsByAttempt_IdAttemptAndQuestion_IdQuestionAndIdSaNot(attempt.getIdAttempt(), question.getIdQuestion(), id)) {
            throw new IllegalArgumentException("Câu hỏi này đã được trả lời trong lượt làm bài");
        }

        QuestionOption option = null;
        if (request.getIdOption() != null && !request.getIdOption().isBlank()) {
            option = questionOptionRepository.findById(request.getIdOption())
                    .orElseThrow(() -> ResourceNotFoundException.of("QuestionOption", request.getIdOption()));

            // V-175: Kiem tra dap an co thuoc ve cau hoi khong
            if (option.getQuestion() == null || !option.getQuestion().getIdQuestion().equals(question.getIdQuestion())) {
                throw new IllegalArgumentException("Đáp án không thuộc về câu hỏi được chọn");
            }
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
