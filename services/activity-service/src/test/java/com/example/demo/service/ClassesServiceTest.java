package com.example.demo.service;

import com.example.demo.dto.request.ClassesRequest;
import com.example.demo.dto.response.ClassesResponse;
import com.example.demo.entity.Classes;
import com.example.demo.exception.DuplicateResourceException;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.ClassesMapper;
import com.example.demo.repository.ClassesRepository;
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
class ClassesServiceTest {

    @Mock
    private ClassesRepository classesRepository;

    @Mock
    private com.example.demo.repository.SectionRepository sectionRepository;

    @Mock
    private ClassesMapper classesMapper;

    @InjectMocks
    private ClassesService classesService;

    @Test
    @DisplayName("V-160: Creating class with duplicate idClasses throws DuplicateResourceException (409)")
    void testCreate_DuplicateId() {
        ClassesRequest request = ClassesRequest.builder()
                .idClasses("TVCLS201511")
                .build();

        when(classesRepository.existsById("TVCLS201511")).thenReturn(true);

        DuplicateResourceException ex = assertThrows(DuplicateResourceException.class, () -> {
            classesService.create(request);
        });

        assertTrue(ex.getMessage().contains("TVCLS201511"));
        verify(classesRepository, never()).save(any());
    }

    @Test
    @DisplayName("Creating class with blank or null id throws IllegalArgumentException (400)")
    void testCreate_BlankId() {
        ClassesRequest request = ClassesRequest.builder()
                .idClasses("")
                .build();

        assertThrows(IllegalArgumentException.class, () -> {
            classesService.create(request);
        });

        ClassesRequest nullRequest = ClassesRequest.builder()
                .idClasses(null)
                .build();

        assertThrows(IllegalArgumentException.class, () -> {
            classesService.create(nullRequest);
        });
    }

    @Test
    @DisplayName("Creating class with new id succeeds")
    void testCreate_Success() {
        ClassesRequest request = ClassesRequest.builder()
                .idClasses("CLASS_NEW_01")
                .build();

        Classes entity = Classes.builder().idClasses("CLASS_NEW_01").build();
        ClassesResponse response = ClassesResponse.builder().idClasses("CLASS_NEW_01").build();

        when(classesRepository.existsById("CLASS_NEW_01")).thenReturn(false);
        when(classesMapper.toEntity(request)).thenReturn(entity);
        when(classesRepository.save(entity)).thenReturn(entity);
        when(classesMapper.toResponse(entity)).thenReturn(response);

        ClassesResponse result = classesService.create(request);

        assertNotNull(result);
        assertEquals("CLASS_NEW_01", result.getIdClasses());
        verify(classesRepository).save(entity);
    }

    @Test
    @DisplayName("Updating class with mismatched id throws IllegalArgumentException (400)")
    void testUpdate_MismatchedId() {
        ClassesRequest request = ClassesRequest.builder()
                .idClasses("CLASS_DIFF")
                .build();

        assertThrows(IllegalArgumentException.class, () -> {
            classesService.update("CLASS_01", request);
        });
    }

    @Test
    @DisplayName("Updating non-existing class throws ResourceNotFoundException (404)")
    void testUpdate_NotFound() {
        ClassesRequest request = ClassesRequest.builder()
                .idClasses("CLASS_01")
                .build();

        when(classesRepository.findById("CLASS_01")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> {
            classesService.update("CLASS_01", request);
        });
    }

    @Test
    @DisplayName("Updating existing class succeeds")
    void testUpdate_Success() {
        ClassesRequest request = ClassesRequest.builder()
                .idClasses("CLASS_01")
                .build();

        Classes entity = Classes.builder().idClasses("CLASS_01").build();
        ClassesResponse response = ClassesResponse.builder().idClasses("CLASS_01").build();

        when(classesRepository.findById("CLASS_01")).thenReturn(Optional.of(entity));
        when(classesRepository.save(entity)).thenReturn(entity);
        when(classesMapper.toResponse(entity)).thenReturn(response);

        ClassesResponse result = classesService.update("CLASS_01", request);

        assertNotNull(result);
        assertEquals("CLASS_01", result.getIdClasses());
    }

    @Test
    @DisplayName("V-190: Deleting class with referencing sections throws DuplicateResourceException (409)")
    void testDelete_HasReferencingSections() {
        when(classesRepository.existsById("CLASS_01")).thenReturn(true);
        when(sectionRepository.existsByClasses_IdClasses("CLASS_01")).thenReturn(true);

        DuplicateResourceException ex = assertThrows(DuplicateResourceException.class, () -> {
            classesService.delete("CLASS_01");
        });

        assertTrue(ex.getMessage().contains("tham chieu"));
        verify(classesRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("Deleting class without referencing sections succeeds")
    void testDelete_Success() {
        when(classesRepository.existsById("CLASS_01")).thenReturn(true);
        when(sectionRepository.existsByClasses_IdClasses("CLASS_01")).thenReturn(false);

        classesService.delete("CLASS_01");

        verify(classesRepository).deleteById("CLASS_01");
    }
}
