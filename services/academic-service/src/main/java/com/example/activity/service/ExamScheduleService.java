package com.example.activity.service;

import com.example.activity.dto.request.ExamScheduleRequest;
import com.example.activity.dto.response.ExamScheduleResponse;
import com.example.activity.entity.ExamSchedule;
import com.example.activity.entity.Semester;
import com.example.activity.entity.Classes;
import com.example.activity.exception.DuplicateResourceException;
import com.example.activity.exception.ResourceNotFoundException;
import com.example.activity.mapper.ExamScheduleMapper;
import com.example.activity.repository.ExamScheduleRepository;
import com.example.activity.repository.SemesterRepository;
import com.example.activity.repository.ClassesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ExamScheduleService {

    private final ExamScheduleRepository examScheduleRepository;
    private final SemesterRepository semesterRepository;
    private final ClassesRepository classesRepository;
    private final ExamScheduleMapper examScheduleMapper;

    @Transactional(readOnly = true)
    public List<ExamScheduleResponse> getAll() {
        return examScheduleRepository.findAll().stream()
                .map(examScheduleMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ExamScheduleResponse getById(String id) {
        return examScheduleMapper.toResponse(findEntity(id));
    }

    @Transactional
    public ExamScheduleResponse create(ExamScheduleRequest request) {
        if (request.getExamId() == null || request.getExamId().isBlank()) {
            throw new IllegalArgumentException("examId is required");
        }
        validateTimes(request.getStartTime(), request.getEndTime());
        if (examScheduleRepository.existsById(request.getExamId())) {
            throw new DuplicateResourceException("ExamSchedule already exists with id: " + request.getExamId());
        }
        ExamSchedule entity = examScheduleMapper.toEntity(request);
        entity.setSemester(findSemester(request.getSemesterId()));
        entity.setClasses(findClasses(request.getIdClasses()));
        return examScheduleMapper.toResponse(examScheduleRepository.save(entity));
    }

    @Transactional
    public ExamScheduleResponse update(String id, ExamScheduleRequest request) {
        if (request.getExamId() != null && !request.getExamId().isBlank() && !request.getExamId().equals(id)) {
            throw new IllegalArgumentException("Path variable id and request body examId do not match");
        }
        validateTimes(request.getStartTime(), request.getEndTime());
        ExamSchedule entity = findEntity(id);
        examScheduleMapper.updateEntity(request, entity);
        entity.setSemester(findSemester(request.getSemesterId()));
        entity.setClasses(findClasses(request.getIdClasses()));
        return examScheduleMapper.toResponse(examScheduleRepository.save(entity));
    }

    private void validateTimes(java.time.LocalDateTime start, java.time.LocalDateTime end) {
        if (start != null && end != null && !start.isBefore(end)) {
            throw new IllegalArgumentException("startTime must be before endTime");
        }
    }

    @Transactional
    public void delete(String id) {
        if (!examScheduleRepository.existsById(id)) {
            throw new ResourceNotFoundException("ExamSchedule not found with id: " + id);
        }
        examScheduleRepository.deleteById(id);
    }

    private ExamSchedule findEntity(String id) {
        return examScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ExamSchedule not found with id: " + id));
    }

    private Semester findSemester(String id) {
        return semesterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Semester not found with id: " + id));
    }

    private Classes findClasses(String id) {
        return classesRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Classes not found with id: " + id));
    }
}
