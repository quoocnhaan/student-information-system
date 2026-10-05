package com.example.activity.service;

import com.example.activity.dto.request.GradeComponentRequest;
import com.example.activity.dto.response.GradeComponentResponse;
import com.example.activity.entity.GradeComponent;
import com.example.activity.exception.DuplicateResourceException;
import com.example.activity.exception.ResourceNotFoundException;
import com.example.activity.mapper.GradeComponentMapper;
import com.example.activity.repository.GradeComponentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GradeComponentService {

    private final GradeComponentRepository gradeComponentRepository;
    private final GradeComponentMapper gradeComponentMapper;

    @Transactional(readOnly = true)
    public List<GradeComponentResponse> getAll() {
        return gradeComponentRepository.findAll().stream()
                .map(gradeComponentMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public GradeComponentResponse getById(String id) {
        return gradeComponentMapper.toResponse(findEntity(id));
    }

    @Transactional
    public GradeComponentResponse create(GradeComponentRequest request) {
        if (request.getIdGradeComponents() == null || request.getIdGradeComponents().isBlank()) {
            throw new IllegalArgumentException("idGradeComponents is required");
        }
        if (gradeComponentRepository.existsById(request.getIdGradeComponents())) {
            throw new DuplicateResourceException("GradeComponent already exists with id: " + request.getIdGradeComponents());
        }
        GradeComponent entity = gradeComponentMapper.toEntity(request);
        return gradeComponentMapper.toResponse(gradeComponentRepository.save(entity));
    }

    @Transactional
    public GradeComponentResponse update(String id, GradeComponentRequest request) {
        if (request.getIdGradeComponents() != null && !request.getIdGradeComponents().isBlank() && !request.getIdGradeComponents().equals(id)) {
            throw new IllegalArgumentException("Path variable id and request body idGradeComponents do not match");
        }
        GradeComponent entity = findEntity(id);
        gradeComponentMapper.updateEntity(request, entity);
        return gradeComponentMapper.toResponse(gradeComponentRepository.save(entity));
    }

    @Transactional
    public void delete(String id) {
        if (!gradeComponentRepository.existsById(id)) {
            throw new ResourceNotFoundException("GradeComponent not found with id: " + id);
        }
        gradeComponentRepository.deleteById(id);
    }

    private GradeComponent findEntity(String id) {
        return gradeComponentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("GradeComponent not found with id: " + id));
    }
}
