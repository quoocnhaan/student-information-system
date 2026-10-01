package com.example.demo.service;

import com.example.demo.dto.request.AttemptRequest;
import com.example.demo.dto.response.AttemptResponse;
import com.example.demo.entity.Attempt;
import com.example.demo.entity.Question;
import com.example.demo.entity.QuestionOption;
import com.example.demo.entity.Quiz;
import com.example.demo.entity.StudentAnswer;
import com.example.demo.mapper.AttemptMapper;
import com.example.demo.repository.AttemptRepository;
import com.example.demo.repository.QuestionRepository;
import com.example.demo.repository.QuizRepository;
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
class AttemptServiceTest {

    @Mock
    private AttemptRepository attemptRepository;

    @Mock
    private QuizRepository quizRepository;

    @Mock
    private QuestionRepository questionRepository;

    @Mock
    private StudentAnswerRepository studentAnswerRepository;

    @Mock
    private AttemptMapper attemptMapper;

    @InjectMocks
    private AttemptService attemptService;

    private Quiz quiz;
    private AttemptRequest request;

    @BeforeEach
    void setUp() {
        quiz = Quiz.builder()
                .idQuiz("quiz-123")
                .attemptsLimit(1)
                .duration(15)
                .build();

        request = AttemptRequest.builder()
                .idQuiz("quiz-123")
                .idStudent("student_01")
                .attemptNumber(2)
                .startTime(LocalDateTime.now())
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
    @DisplayName("Should create attempt successfully and auto-generate attemptNumber when count < attemptsLimit")
    void testCreate_Success() {
        when(quizRepository.findById("quiz-123")).thenReturn(Optional.of(quiz));
        when(attemptRepository.countByQuiz_IdQuizAndIdStudent("quiz-123", "student_01")).thenReturn(0L);

        Attempt mappedAttempt = Attempt.builder()
                .idStudent("student_01")
                .build();
        when(attemptMapper.toEntity(request)).thenReturn(mappedAttempt);

        Attempt savedAttempt = Attempt.builder()
                .idAttempt("att-001")
                .idStudent("student_01")
                .attemptNumber(1)
                .quiz(quiz)
                .build();
        when(attemptRepository.save(any(Attempt.class))).thenReturn(savedAttempt);

        AttemptResponse expectedResponse = AttemptResponse.builder()
                .idAttempt("att-001")
                .idQuiz("quiz-123")
                .idStudent("student_01")
                .attemptNumber(1)
                .build();
        when(attemptMapper.toResponse(savedAttempt)).thenReturn(expectedResponse);

        AttemptResponse response = attemptService.create(request);

        assertNotNull(response);
        assertEquals(1, response.getAttemptNumber());
        assertEquals("att-001", response.getIdAttempt());
        verify(attemptRepository).save(argThat(entity -> entity.getAttemptNumber() == 1));
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when attempts count reaches attemptsLimit")
    void testCreate_ExceedsLimit() {
        when(quizRepository.findById("quiz-123")).thenReturn(Optional.of(quiz));
        when(attemptRepository.countByQuiz_IdQuizAndIdStudent("quiz-123", "student_01")).thenReturn(1L);

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            attemptService.create(request);
        });

        assertTrue(exception.getMessage().contains("giới hạn số lần làm bài"));
        verify(attemptRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should allow unlimited attempts when attemptsLimit is null or 0")
    void testCreate_Unlimited() {
        quiz.setAttemptsLimit(null);
        when(quizRepository.findById("quiz-123")).thenReturn(Optional.of(quiz));
        when(attemptRepository.countByQuiz_IdQuizAndIdStudent("quiz-123", "student_01")).thenReturn(5L);

        Attempt mappedAttempt = Attempt.builder().idStudent("student_01").build();
        when(attemptMapper.toEntity(request)).thenReturn(mappedAttempt);
        when(attemptRepository.save(any(Attempt.class))).thenReturn(mappedAttempt);
        when(attemptMapper.toResponse(any())).thenReturn(AttemptResponse.builder().attemptNumber(6).build());

        AttemptResponse response = attemptService.create(request);
        assertNotNull(response);
        assertEquals(6, response.getAttemptNumber());
        verify(attemptRepository).save(argThat(entity -> entity.getAttemptNumber() == 6));
    }

    @Test
    @DisplayName("V-169: Student cannot set grade on create - grade must be null")
    void testCreate_StudentGradeIgnored() {
        setSecurityContext("student_01", "ROLE_STUDENT");
        request.setGrade(10.0f);

        when(quizRepository.findById("quiz-123")).thenReturn(Optional.of(quiz));
        when(attemptRepository.countByQuiz_IdQuizAndIdStudent("quiz-123", "student_01")).thenReturn(0L);

        Attempt mappedAttempt = Attempt.builder()
                .idStudent("student_01")
                .grade(10.0f)
                .build();
        when(attemptMapper.toEntity(request)).thenReturn(mappedAttempt);

        when(attemptRepository.save(any(Attempt.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(attemptMapper.toResponse(any(Attempt.class))).thenAnswer(invocation -> {
            Attempt att = invocation.getArgument(0);
            return AttemptResponse.builder()
                    .idStudent(att.getIdStudent())
                    .grade(att.getGrade())
                    .build();
        });

        AttemptResponse response = attemptService.create(request);
        assertNotNull(response);
        assertNull(response.getGrade(), "Grade must be null for student on attempt creation");
        verify(attemptRepository).save(argThat(att -> att.getGrade() == null));
    }

    @Test
    @DisplayName("V-170: Student cannot self-grade on update - grade is calculated from student answers")
    void testUpdate_StudentGradeCalculatedFromAnswers() {
        setSecurityContext("student_01", "ROLE_STUDENT");

        Attempt existingAttempt = Attempt.builder()
                .idAttempt("att-001")
                .idStudent("student_01")
                .attemptNumber(1)
                .quiz(quiz)
                .grade(null)
                .build();
        when(attemptRepository.findById("att-001")).thenReturn(Optional.of(existingAttempt));
        when(quizRepository.findById("quiz-123")).thenReturn(Optional.of(quiz));

        // Quiz has 2 questions
        Question q1 = Question.builder().idQuestion("q-1").build();
        Question q2 = Question.builder().idQuestion("q-2").build();
        when(questionRepository.findByQuiz_IdQuiz("quiz-123")).thenReturn(List.of(q1, q2));

        // Student answered 1 correctly (option with correct=true)
        QuestionOption optCorrect = QuestionOption.builder().idOption("opt-1").correct(true).build();
        StudentAnswer sa1 = StudentAnswer.builder().idSa("sa-1").question(q1).option(optCorrect).build();
        when(studentAnswerRepository.findByAttempt_IdAttempt("att-001")).thenReturn(List.of(sa1));

        when(attemptRepository.save(any(Attempt.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(attemptMapper.toResponse(any(Attempt.class))).thenAnswer(invocation -> {
            Attempt att = invocation.getArgument(0);
            return AttemptResponse.builder()
                    .idAttempt(att.getIdAttempt())
                    .idStudent(att.getIdStudent())
                    .grade(att.getGrade())
                    .finishedTime(att.getFinishedTime())
                    .build();
        });

        // Student attempts to submit with grade=10.0f
        AttemptRequest updateRequest = AttemptRequest.builder()
                .idQuiz("quiz-123")
                .idStudent("student_01")
                .finishedTime(LocalDateTime.now())
                .grade(10.0f)
                .build();

        AttemptResponse response = attemptService.update("att-001", updateRequest);
        assertNotNull(response);
        assertEquals(5.0f, response.getGrade(), "Grade must be calculated from answers (1/2 = 5.0), not 10.0");
        verify(attemptRepository).save(argThat(att -> att.getGrade() == 5.0f));
    }

    @Test
    @DisplayName("V-170: Student with 0 answers gets grade 0.0, ignoring supplied grade=10")
    void testUpdate_StudentWithNoAnswers_GradeIsZero() {
        setSecurityContext("student_01", "ROLE_STUDENT");

        Attempt existingAttempt = Attempt.builder()
                .idAttempt("att-001")
                .idStudent("student_01")
                .attemptNumber(1)
                .quiz(quiz)
                .grade(null)
                .build();
        when(attemptRepository.findById("att-001")).thenReturn(Optional.of(existingAttempt));
        when(quizRepository.findById("quiz-123")).thenReturn(Optional.of(quiz));

        Question q1 = Question.builder().idQuestion("q-1").build();
        when(questionRepository.findByQuiz_IdQuiz("quiz-123")).thenReturn(List.of(q1));
        when(studentAnswerRepository.findByAttempt_IdAttempt("att-001")).thenReturn(List.of());

        when(attemptRepository.save(any(Attempt.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(attemptMapper.toResponse(any(Attempt.class))).thenAnswer(invocation -> {
            Attempt att = invocation.getArgument(0);
            return AttemptResponse.builder()
                    .grade(att.getGrade())
                    .build();
        });

        AttemptRequest updateRequest = AttemptRequest.builder()
                .idQuiz("quiz-123")
                .idStudent("student_01")
                .finishedTime(LocalDateTime.now())
                .grade(10.0f)
                .build();

        AttemptResponse response = attemptService.update("att-001", updateRequest);
        assertNotNull(response);
        assertEquals(0.0f, response.getGrade(), "Grade must be 0.0 when student has 0 correct answers");
    }

    @Test
    @DisplayName("Admin or Lecturer can update grade directly")
    void testUpdateGrade_AdminOrLecturer() {
        Attempt existingAttempt = Attempt.builder()
                .idAttempt("att-001")
                .grade(null)
                .build();
        when(attemptRepository.findById("att-001")).thenReturn(Optional.of(existingAttempt));
        when(attemptRepository.save(any(Attempt.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(attemptMapper.toResponse(any(Attempt.class))).thenAnswer(invocation -> {
            Attempt att = invocation.getArgument(0);
            return AttemptResponse.builder().grade(att.getGrade()).build();
        });

        AttemptResponse response = attemptService.updateGrade("att-001", 9.5f);
        assertNotNull(response);
        assertEquals(9.5f, response.getGrade());
        verify(attemptRepository).save(argThat(att -> att.getGrade() == 9.5f));
    }

    @Test
    @DisplayName("V-179: Finished time before start time on update throws IllegalArgumentException")
    void testUpdate_FinishedTimeBeforeStartTime() {
        Attempt existingAttempt = Attempt.builder()
                .idAttempt("att-001")
                .idStudent("student_01")
                .startTime(LocalDateTime.of(2026, 10, 5, 9, 30))
                .quiz(quiz)
                .build();
        when(attemptRepository.findById("att-001")).thenReturn(Optional.of(existingAttempt));
        when(quizRepository.findById("quiz-123")).thenReturn(Optional.of(quiz));

        AttemptRequest updateRequest = AttemptRequest.builder()
                .idQuiz("quiz-123")
                .idStudent("student_01")
                .startTime(LocalDateTime.of(2026, 10, 5, 9, 30))
                .finishedTime(LocalDateTime.of(2026, 10, 5, 9, 0)) // 30 mins before start
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            attemptService.update("att-001", updateRequest);
        });

        assertTrue(ex.getMessage().contains("finishedTime phai sau hoac bang startTime"));
    }

    @Test
    @DisplayName("V-186: Negative grade throws IllegalArgumentException")
    void testUpdateGrade_NegativeGrade() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            attemptService.updateGrade("att-001", -1.0f);
        });

        assertTrue(ex.getMessage().contains("grade phai trong khoang tu 0.0 den 10.0"));
    }

    @Test
    @DisplayName("V-186: Grade greater than 10.0 throws IllegalArgumentException")
    void testUpdateGrade_GradeTooHigh() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            attemptService.updateGrade("att-001", 10.5f);
        });

        assertTrue(ex.getMessage().contains("grade phai trong khoang tu 0.0 den 10.0"));
    }
}
