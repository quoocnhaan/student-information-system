package com.example.demo.service;

import com.example.demo.dto.request.QuizRequest;
import com.example.demo.mapper.QuizMapper;
import com.example.demo.repository.ActivityRepository;
import com.example.demo.repository.QuizRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@ExtendWith(MockitoExtension.class)
class QuizServiceTest {

    @Mock
    private QuizRepository quizRepository;

    @Mock
    private ActivityRepository activityRepository;

    @Mock
    private QuizMapper quizMapper;

    @InjectMocks
    private QuizService quizService;

    @Test
    @DisplayName("V-180: Negative duration throws IllegalArgumentException")
    void testCreate_NegativeDuration() {
        QuizRequest request = QuizRequest.builder()
                .idActivity("act-1")
                .description("Sample Quiz")
                .duration(-10)
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            quizService.create(request);
        });

        assertTrue(ex.getMessage().contains("duration phai lon hon 0"));
    }

    @Test
    @DisplayName("V-180: Zero duration throws IllegalArgumentException")
    void testCreate_ZeroDuration() {
        QuizRequest request = QuizRequest.builder()
                .idActivity("act-1")
                .description("Sample Quiz")
                .duration(0)
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            quizService.create(request);
        });

        assertTrue(ex.getMessage().contains("duration phai lon hon 0"));
    }

    @Test
    @DisplayName("V-181: Negative attemptsLimit throws IllegalArgumentException")
    void testCreate_NegativeAttemptsLimit() {
        QuizRequest request = QuizRequest.builder()
                .idActivity("act-1")
                .description("Sample Quiz")
                .duration(15)
                .attemptsLimit(-1)
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            quizService.create(request);
        });

        assertTrue(ex.getMessage().contains("attemptsLimit phai lon hon 0"));
    }

    @Test
    @DisplayName("V-161: Creating second quiz for same activity throws DuplicateResourceException (409)")
    void testCreate_DuplicateQuizForActivity() {
        QuizRequest request = QuizRequest.builder()
                .idActivity("act-1")
                .description("Duplicate Quiz")
                .duration(15)
                .build();

        com.example.demo.entity.Activity activity = com.example.demo.entity.Activity.builder()
                .idActivity("act-1")
                .build();
        com.example.demo.entity.Quiz existingQuiz = com.example.demo.entity.Quiz.builder()
                .idQuiz("quiz-1")
                .activity(activity)
                .build();

        org.mockito.Mockito.when(activityRepository.findById("act-1")).thenReturn(java.util.Optional.of(activity));
        org.mockito.Mockito.when(quizRepository.findByActivity_IdActivity("act-1")).thenReturn(java.util.Optional.of(existingQuiz));

        com.example.demo.exception.DuplicateResourceException ex = assertThrows(
                com.example.demo.exception.DuplicateResourceException.class, () -> {
            quizService.create(request);
        });

        assertTrue(ex.getMessage().contains("da co quiz roi"));
    }
}
