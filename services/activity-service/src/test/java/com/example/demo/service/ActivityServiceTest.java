package com.example.demo.service;

import com.example.demo.dto.request.ActivityRequest;
import com.example.demo.entity.Section;
import com.example.demo.mapper.ActivityMapper;
import com.example.demo.repository.ActivityRepository;
import com.example.demo.repository.SectionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@ExtendWith(MockitoExtension.class)
class ActivityServiceTest {

    @Mock
    private ActivityRepository activityRepository;

    @Mock
    private SectionRepository sectionRepository;

    @Mock
    private ActivityMapper activityMapper;

    @InjectMocks
    private ActivityService activityService;

    @Test
    @DisplayName("V-178: Closing date before opening date throws IllegalArgumentException")
    void testCreate_ClosingBeforeOpening() {
        ActivityRequest request = ActivityRequest.builder()
                .idSection("sec-1")
                .name("Quiz 1")
                .type("quiz")
                .timeOpen(LocalDate.of(2026, 10, 10))
                .timeClose(LocalDate.of(2026, 10, 5))
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            activityService.create(request);
        });

        assertTrue(ex.getMessage().contains("timeClose phai sau hoac bang timeOpen"));
    }
}
