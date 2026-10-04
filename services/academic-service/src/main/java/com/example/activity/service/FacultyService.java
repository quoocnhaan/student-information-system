package com.example.activity.service;

import com.example.activity.dto.request.FacultyRequest;
import com.example.activity.dto.response.FacultyResponse;
import com.example.activity.entity.Faculty;
import com.example.activity.exception.DuplicateResourceException;
import com.example.activity.exception.ResourceNotFoundException;
import com.example.activity.mapper.FacultyMapper;
import com.example.activity.repository.FacultyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FacultyService {

    private final FacultyRepository facultyRepository;
    private final FacultyMapper facultyMapper;

    @Transactional(readOnly = true)
    public List<FacultyResponse> getAll() {
        return facultyRepository.findAll().stream()
                .map(facultyMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public FacultyResponse getById(String id) {
        return facultyMapper.toResponse(findEntity(id));
    }

    @Transactional
    public FacultyResponse create(FacultyRequest request) {
        if (request.getFacultyId() == null || request.getFacultyId().isBlank()) {
            throw new IllegalArgumentException("facultyId is required");
        }
        if (facultyRepository.existsById(request.getFacultyId())) {
            throw new DuplicateResourceException("Faculty already exists with id: " + request.getFacultyId());
        }
        Faculty entity = facultyMapper.toEntity(request);
        return facultyMapper.toResponse(facultyRepository.save(entity));
    }

    @Transactional
    public FacultyResponse update(String id, FacultyRequest request) {
        if (request.getFacultyId() != null && !request.getFacultyId().isBlank() && !request.getFacultyId().equals(id)) {
            throw new IllegalArgumentException("Path variable id and request body facultyId do not match");
        }
        Faculty entity = findEntity(id);
        facultyMapper.updateEntity(request, entity);
        return facultyMapper.toResponse(facultyRepository.save(entity));
    }

    @Transactional
    public void delete(String id) {
        if (!facultyRepository.existsById(id)) {
            throw new ResourceNotFoundException("Faculty not found with id: " + id);
        }
        facultyRepository.deleteById(id);
    }

    private Faculty findEntity(String id) {
        return facultyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty not found with id: " + id));
    }
}
