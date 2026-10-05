package com.example.demo.service;

import com.example.demo.dto.request.SectionRequest;
import com.example.demo.dto.response.SectionResponse;
import com.example.demo.entity.Classes;
import com.example.demo.entity.Section;
import com.example.demo.mapper.SectionMapper;
import com.example.demo.repository.ClassesRepository;
import com.example.demo.repository.SectionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SectionServiceTest {

    @Mock
    private SectionRepository sectionRepository;

    @Mock
    private ClassesRepository classesRepository;

    @Mock
    private SectionMapper sectionMapper;

    @InjectMocks
    private SectionService sectionService;

    @Test
    @DisplayName("V-185: Section name exceeding 255 characters throws IllegalArgumentException (400)")
    void testCreate_NameTooLong() {
        String longName = "a".repeat(256);
        SectionRequest request = SectionRequest.builder()
                .idClasses("CLASS_01")
                .name(longName)
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            sectionService.create(request);
        });

        assertTrue(ex.getMessage().contains("255"));
        verify(sectionRepository, never()).save(any());
    }

    @Test
    @DisplayName("V-185: Section name update exceeding 255 characters throws IllegalArgumentException (400)")
    void testUpdate_NameTooLong() {
        String longName = "a".repeat(256);
        SectionRequest request = SectionRequest.builder()
                .idClasses("CLASS_01")
                .name(longName)
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            sectionService.update("sec-1", request);
        });

        assertTrue(ex.getMessage().contains("255"));
        verify(sectionRepository, never()).save(any());
    }

    @Test
    @DisplayName("Creating section with valid name succeeds")
    void testCreate_Success() {
        SectionRequest request = SectionRequest.builder()
                .idClasses("CLASS_01")
                .name("Chuong 1: Tong quan")
                .build();

        Classes classes = Classes.builder().idClasses("CLASS_01").build();
        Section entity = Section.builder().name("Chuong 1: Tong quan").classes(classes).build();
        SectionResponse response = SectionResponse.builder().idSection("sec-1").name("Chuong 1: Tong quan").build();

        when(classesRepository.findById("CLASS_01")).thenReturn(Optional.of(classes));
        when(sectionMapper.toEntity(request)).thenReturn(entity);
        when(sectionRepository.save(entity)).thenReturn(entity);
        when(sectionMapper.toResponse(entity)).thenReturn(response);

        SectionResponse result = sectionService.create(request);

        assertNotNull(result);
        assertEquals("sec-1", result.getIdSection());
        verify(sectionRepository).save(entity);
    }
}
