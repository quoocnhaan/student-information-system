package com.example.activity.service;

import com.example.activity.dto.request.SemesterRequest;
import com.example.activity.dto.response.SemesterResponse;
import com.example.activity.entity.Semester;
import com.example.activity.exception.DuplicateResourceException;
import com.example.activity.exception.ResourceNotFoundException;
import com.example.activity.mapper.SemesterMapper;
import com.example.activity.repository.SemesterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SemesterService {

    private final SemesterRepository semesterRepository;
    private final SemesterMapper semesterMapper;

    @Transactional(readOnly = true)
    public List<SemesterResponse> getAll() {
        return semesterRepository.findAll().stream()
                .map(semesterMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SemesterResponse getById(String id) {
        return semesterMapper.toResponse(findEntity(id));
    }

    @Transactional
    public SemesterResponse create(SemesterRequest request) {
        if (request.getSemesterId() == null || request.getSemesterId().isBlank()) {
            throw new IllegalArgumentException("semesterId is required");
        }
        validateDates(request.getStartDate(), request.getEndDate());
        if (semesterRepository.existsById(request.getSemesterId())) {
            throw new DuplicateResourceException("Semester already exists with id: " + request.getSemesterId());
        }
        Semester entity = semesterMapper.toEntity(request);
        return semesterMapper.toResponse(semesterRepository.save(entity));
    }

    @Transactional
    public SemesterResponse update(String id, SemesterRequest request) {
        if (request.getSemesterId() != null && !request.getSemesterId().isBlank() && !request.getSemesterId().equals(id)) {
            throw new IllegalArgumentException("Path variable id and request body semesterId do not match");
        }
        validateDates(request.getStartDate(), request.getEndDate());
        Semester entity = findEntity(id);
        semesterMapper.updateEntity(request, entity);
        return semesterMapper.toResponse(semesterRepository.save(entity));
    }

    private void validateDates(java.time.LocalDate startDate, java.time.LocalDate endDate) {
        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("startDate must be before or equal to endDate");
        }
    }

    @Transactional
    public void delete(String id) {
        if (!semesterRepository.existsById(id)) {
            throw new ResourceNotFoundException("Semester not found with id: " + id);
        }
        semesterRepository.deleteById(id);
    }

    private Semester findEntity(String id) {
        return semesterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Semester not found with id: " + id));
    }
}
