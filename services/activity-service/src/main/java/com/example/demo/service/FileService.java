package com.example.demo.service;

import com.example.demo.dto.request.FileRequest;
import com.example.demo.dto.response.FileResponse;
import com.example.demo.entity.Activity;
import com.example.demo.entity.FileEntity;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.FileMapper;
import com.example.demo.repository.ActivityRepository;
import com.example.demo.repository.FileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class FileService {

    private final FileRepository fileRepository;
    private final ActivityRepository activityRepository;
    private final FileMapper fileMapper;

    public FileResponse create(FileRequest request) {
        validateUrl(request.getFileUrl());
        Activity activity = activityRepository.findById(request.getIdActivity())
                .orElseThrow(() -> ResourceNotFoundException.of("Activity", request.getIdActivity()));

        FileEntity entity = fileMapper.toEntity(request);
        entity.setIdFile(UUID.randomUUID().toString());
        entity.setActivity(activity);

        return fileMapper.toResponse(fileRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public FileResponse getById(String id) {
        FileEntity entity = fileRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("File", id));
        return fileMapper.toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<FileResponse> getAll() {
        return fileRepository.findAll().stream().map(fileMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<FileResponse> getByActivity(String idActivity) {
        return fileRepository.findByActivity_IdActivity(idActivity).stream()
                .map(fileMapper::toResponse).toList();
    }

    public FileResponse update(String id, FileRequest request) {
        validateUrl(request.getFileUrl());
        FileEntity entity = fileRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("File", id));

        Activity activity = activityRepository.findById(request.getIdActivity())
                .orElseThrow(() -> ResourceNotFoundException.of("Activity", request.getIdActivity()));

        entity.setDescription(request.getDescription());
        entity.setFileUrl(request.getFileUrl());
        entity.setActivity(activity);

        return fileMapper.toResponse(fileRepository.save(entity));
    }

    private void validateUrl(String urlStr) {
        if (urlStr == null || urlStr.isBlank()) {
            throw new IllegalArgumentException("fileUrl khong duoc de trong");
        }
        try {
            java.net.URI uri = new java.net.URI(urlStr);
            if (uri.getScheme() == null || uri.getHost() == null) {
                throw new IllegalArgumentException("fileUrl phai la URL hop le (vi du: http://example.com/file.pdf)");
            }
            if (!uri.getScheme().equalsIgnoreCase("http") &&
                !uri.getScheme().equalsIgnoreCase("https") &&
                !uri.getScheme().equalsIgnoreCase("ftp")) {
                throw new IllegalArgumentException("fileUrl scheme khong hop le");
            }
        } catch (Exception e) {
            throw new IllegalArgumentException("fileUrl khong phai URL hop le: " + e.getMessage());
        }
    }

    public void delete(String id) {
        if (!fileRepository.existsById(id)) {
            throw ResourceNotFoundException.of("File", id);
        }
        fileRepository.deleteById(id);
    }
}
