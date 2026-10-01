package com.example.demo.service;

import com.example.demo.dto.request.FileRequest;
import com.example.demo.mapper.FileMapper;
import com.example.demo.repository.ActivityRepository;
import com.example.demo.repository.FileRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@ExtendWith(MockitoExtension.class)
class FileServiceTest {

    @Mock
    private FileRepository fileRepository;

    @Mock
    private ActivityRepository activityRepository;

    @Mock
    private FileMapper fileMapper;

    @InjectMocks
    private FileService fileService;

    @Test
    @DisplayName("V-187: Invalid fileUrl throws IllegalArgumentException")
    void testCreate_InvalidFileUrl() {
        FileRequest request = FileRequest.builder()
                .idActivity("act-1")
                .description("Sample file")
                .fileUrl("not-a-valid-url")
                .build();

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            fileService.create(request);
        });

        assertTrue(ex.getMessage().contains("fileUrl"));
    }
}
