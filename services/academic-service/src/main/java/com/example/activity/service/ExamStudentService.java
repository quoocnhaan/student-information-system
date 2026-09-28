package com.example.activity.service;

import com.example.activity.dto.request.ExamStudentRequest;
import com.example.activity.dto.response.ExamStudentResponse;
import com.example.activity.entity.ExamStudent;
import com.example.activity.entity.ExamSchedule;
import com.example.activity.exception.DuplicateResourceException;
import com.example.activity.exception.ResourceNotFoundException;
import com.example.activity.mapper.ExamStudentMapper;
import com.example.activity.repository.ExamStudentRepository;
import com.example.activity.repository.ExamScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ExamStudentService {

    private final ExamStudentRepository examStudentRepository;
    private final ExamScheduleRepository examScheduleRepository;
    private final ExamStudentMapper examStudentMapper;

    @Transactional(readOnly = true)
    public List<ExamStudentResponse> getAll() {
        return examStudentRepository.findAll().stream()
                .map(examStudentMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ExamStudentResponse getById(Integer id) {
        return examStudentMapper.toResponse(findEntity(id));
    }

    @Transactional
    public ExamStudentResponse create(ExamStudentRequest request) {
        if (examStudentRepository.existsByExamSchedule_ExamIdAndStudentId(request.getExamId(), request.getStudentId())) {
            throw new DuplicateResourceException("Student is already registered for this exam schedule");
        }
        ExamSchedule examSchedule = findExamSchedule(request.getExamId());
        if (examSchedule.getCapacity() != null && examStudentRepository.countByExamSchedule_ExamId(request.getExamId()) >= examSchedule.getCapacity()) {
            throw new IllegalArgumentException("Exam schedule is already full (capacity: " + examSchedule.getCapacity() + ")");
        }
        ExamStudent entity = examStudentMapper.toEntity(request);
        entity.setExamSchedule(examSchedule);
        return examStudentMapper.toResponse(examStudentRepository.save(entity));
    }

    @Transactional
    public ExamStudentResponse update(Integer id, ExamStudentRequest request) {
        ExamStudent entity = findEntity(id);
        if (!entity.getExamSchedule().getExamId().equals(request.getExamId()) || !entity.getStudentId().equals(request.getStudentId())) {
            if (examStudentRepository.existsByExamSchedule_ExamIdAndStudentId(request.getExamId(), request.getStudentId())) {
                throw new DuplicateResourceException("Student is already registered for this exam schedule");
            }
        }
        ExamSchedule examSchedule = findExamSchedule(request.getExamId());
        examStudentMapper.updateEntity(request, entity);
        entity.setExamSchedule(examSchedule);
        return examStudentMapper.toResponse(examStudentRepository.save(entity));
    }

    @Transactional
    public void delete(Integer id) {
        if (!examStudentRepository.existsById(id)) {
            throw new ResourceNotFoundException("ExamStudent not found with id: " + id);
        }
        examStudentRepository.deleteById(id);
    }

    private ExamStudent findEntity(Integer id) {
        return examStudentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ExamStudent not found with id: " + id));
    }

    private ExamSchedule findExamSchedule(String id) {
        return examScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ExamSchedule not found with id: " + id));
    }
}
