package com.example.activity.service;

import com.example.activity.dto.request.MajorRequest;
import com.example.activity.dto.response.MajorResponse;
import com.example.activity.entity.Major;
import com.example.activity.entity.Faculty;
import com.example.activity.exception.DuplicateResourceException;
import com.example.activity.exception.ResourceNotFoundException;
import com.example.activity.mapper.MajorMapper;
import com.example.activity.repository.MajorRepository;
import com.example.activity.repository.FacultyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MajorService {

    private final MajorRepository majorRepository;
    private final FacultyRepository facultyRepository;
    private final MajorMapper majorMapper;

    @Transactional(readOnly = true)
    public List<MajorResponse> getAll() {
        return majorRepository.findAll().stream()
                .map(majorMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public MajorResponse getById(String id) {
        return majorMapper.toResponse(findEntity(id));
    }

    @Transactional
    public MajorResponse create(MajorRequest request) {
        if (request.getMajorId() == null || request.getMajorId().isBlank()) {
            throw new IllegalArgumentException("majorId is required");
        }
        if (majorRepository.existsById(request.getMajorId())) {
            throw new DuplicateResourceException("Major already exists with id: " + request.getMajorId());
        }
        Major entity = majorMapper.toEntity(request);
        entity.setFaculty(findFaculty(request.getFacultyId()));
        return majorMapper.toResponse(majorRepository.save(entity));
    }

    @Transactional
    public MajorResponse update(String id, MajorRequest request) {
        if (request.getMajorId() != null && !request.getMajorId().isBlank() && !request.getMajorId().equals(id)) {
            throw new IllegalArgumentException("Path variable id and request body majorId do not match");
        }
        Major entity = findEntity(id);
        majorMapper.updateEntity(request, entity);
        entity.setFaculty(findFaculty(request.getFacultyId()));
        return majorMapper.toResponse(majorRepository.save(entity));
    }

    @Transactional
    public void delete(String id) {
        if (!majorRepository.existsById(id)) {
            throw new ResourceNotFoundException("Major not found with id: " + id);
        }
        majorRepository.deleteById(id);
    }

    private Major findEntity(String id) {
        return majorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Major not found with id: " + id));
    }

    private Faculty findFaculty(String id) {
        return facultyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Faculty not found with id: " + id));
    }
}
