package com.example.demo.service;

import com.example.demo.dto.request.StudentAnswerRequest;
import com.example.demo.dto.response.StudentAnswerResponse;
import com.example.demo.entity.Attempt;
import com.example.demo.entity.Question;
import com.example.demo.entity.QuestionOption;
import com.example.demo.entity.Quiz;
import com.example.demo.entity.StudentAnswer;
import com.example.demo.mapper.StudentAnswerMapper;
import com.example.demo.repository.AttemptRepository;
import com.example.demo.repository.QuestionOptionRepository;
import com.example.demo.repository.QuestionRepository;
import com.example.demo.repository.StudentAnswerRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudentAnswerServiceTest {

    @Mock
    private StudentAnswerRepository studentAnswerRepository;

    @Mock
    private AttemptRepository attemptRepository;

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private QuestionOptionRepository questionOptionRepository;

    @Mock
    private StudentAnswerMapper studentAnswerMapper;

    @InjectMocks
    private StudentAnswerService studentAnswerService;

    private Quiz quiz1;
    private Quiz quiz2;
    private Question question1;
    private Question question2;
    private QuestionOption option1Q1;
    private QuestionOption option2Q2;
    private Attempt attempt;

    @BeforeEach
    void setUp() {
        quiz1 = Quiz.builder().idQuiz("quiz-1").build();
        quiz2 = Quiz.builder().idQuiz("quiz-2").build();

        question1 = Question.builder().idQuestion("q-1").quiz(quiz1).title("Question 1").build();
        question2 = Question.builder().idQuestion("q-2").quiz(quiz2).title("Question 2").build();

        option1Q1 = QuestionOption.builder().idOption("opt-1").question(question1).answer("Ans 1").correct(true).build();
        option2Q2 = QuestionOption.builder().idOption("opt-2").question(question2).answer("Ans 2").correct(false).build();

        attempt = Attempt.builder()
                .idAttempt("att-1")
                .quiz(quiz1)
                .idStudent("student_01")
                .attemptNumber(1)
                .startTime(LocalDateTime.now())
                .finishedTime(null)
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void setSecurityContext(String username, String role) {
        Authentication auth = new UsernamePasswordAuthenticationToken(
                username, null, List.of(new SimpleGrantedAuthority(role))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("Should submit answer successfully when valid")
    void testCreate_Success() {
        setSecurityContext("student_01", "ROLE_STUDENT");

        StudentAnswerRequest request = StudentAnswerRequest.builder()
                .idAttempt("att-1")
                .idQuestion("q-1")
                .idOption("opt-1")
                .build();

        when(attemptRepository.findById("att-1")).thenReturn(Optional.of(attempt));
        when(questionRepository.findById("q-1")).thenReturn(Optional.of(question1));
        when(studentAnswerRepository.existsByAttempt_IdAttemptAndQuestion_IdQuestion("att-1", "q-1")).thenReturn(false);
        when(questionOptionRepository.findById("opt-1")).thenReturn(Optional.of(option1Q1));

        StudentAnswer entity = StudentAnswer.builder().idSa("sa-1").attempt(attempt).question(question1).option(option1Q1).build();
        when(studentAnswerMapper.toEntity(request)).thenReturn(entity);
        when(studentAnswerRepository.save(any(StudentAnswer.class))).thenReturn(entity);
        when(studentAnswerMapper.toResponse(entity)).thenReturn(StudentAnswerResponse.builder().idSa("sa-1").build());

        StudentAnswerResponse response = studentAnswerService.create(request);
        assertNotNull(response);
        assertEquals("sa-1", response.getIdSa());
        verify(studentAnswerRepository).save(any(StudentAnswer.class));
    }

    @Test
    @DisplayName("V-175: Option belongs to a different question - throws IllegalArgumentException")
    void testCreate_OptionBelongsToDifferentQuestion() {
        setSecurityContext("student_01", "ROLE_STUDENT");

        // Request question1 but option belongs to question2
        StudentAnswerRequest request = StudentAnswerRequest.builder()
                .idAttempt("att-1")
                .idQuestion("q-1")
                .idOption("opt-2")
                .build();

        when(attemptRepository.findById("att-1")).thenReturn(Optional.of(attempt));
        when(questionRepository.findById("q-1")).thenReturn(Optional.of(question1));
        when(studentAnswerRepository.existsByAttempt_IdAttemptAndQuestion_IdQuestion("att-1", "q-1")).thenReturn(false);
        when(questionOptionRepository.findById("opt-2")).thenReturn(Optional.of(option2Q2));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            studentAnswerService.create(request);
        });

        assertTrue(ex.getMessage().contains("Đáp án không thuộc về câu hỏi được chọn"));
        verify(studentAnswerRepository, never()).save(any());
    }

    @Test
    @DisplayName("V-176: Question does not belong to attempt's quiz - throws IllegalArgumentException")
    void testCreate_QuestionNotBelongToQuiz() {
        setSecurityContext("student_01", "ROLE_STUDENT");

        // Attempt is for quiz1, but question2 belongs to quiz2
        StudentAnswerRequest request = StudentAnswerRequest.builder()
                .idAttempt("att-1")
                .idQuestion("q-2")
                .idOption("opt-2")
                .build();

        when(attemptRepository.findById("att-1")).thenReturn(Optional.of(attempt));
        when(questionRepository.findById("q-2")).thenReturn(Optional.of(question2));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            studentAnswerService.create(request);
        });

        assertTrue(ex.getMessage().contains("Câu hỏi không thuộc về bài trắc nghiệm của lượt làm bài này"));
        verify(studentAnswerRepository, never()).save(any());
    }

    @Test
    @DisplayName("V-177: Two answers for the same question in the same attempt - throws IllegalArgumentException")
    void testCreate_DuplicateAnswerInSameAttempt() {
        setSecurityContext("student_01", "ROLE_STUDENT");

        StudentAnswerRequest request = StudentAnswerRequest.builder()
                .idAttempt("att-1")
                .idQuestion("q-1")
                .idOption("opt-1")
                .build();

        when(attemptRepository.findById("att-1")).thenReturn(Optional.of(attempt));
        when(questionRepository.findById("q-1")).thenReturn(Optional.of(question1));
        when(studentAnswerRepository.existsByAttempt_IdAttemptAndQuestion_IdQuestion("att-1", "q-1")).thenReturn(true);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            studentAnswerService.create(request);
        });

        assertTrue(ex.getMessage().contains("Câu hỏi này đã được trả lời trong lượt làm bài"));
        verify(studentAnswerRepository, never()).save(any());
    }

    @Test
    @DisplayName("Attempt already finished - cannot submit new answer")
    void testCreate_AttemptAlreadyFinished() {
        setSecurityContext("student_01", "ROLE_STUDENT");
        attempt.setFinishedTime(LocalDateTime.now());

        StudentAnswerRequest request = StudentAnswerRequest.builder()
                .idAttempt("att-1")
                .idQuestion("q-1")
                .idOption("opt-1")
                .build();

        when(attemptRepository.findById("att-1")).thenReturn(Optional.of(attempt));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            studentAnswerService.create(request);
        });

        assertTrue(ex.getMessage().contains("Lượt làm bài đã kết thúc"));
        verify(studentAnswerRepository, never()).save(any());
    }
}
