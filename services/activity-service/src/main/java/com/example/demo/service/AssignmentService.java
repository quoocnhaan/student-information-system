package com.example.demo.service;

import com.example.demo.dto.request.AssignmentRequest;
import com.example.demo.dto.response.AssignmentResponse;
import com.example.demo.entity.Activity;
import com.example.demo.entity.Assignment;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.AssignmentMapper;
import com.example.demo.repository.ActivityRepository;
import com.example.demo.repository.AssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AssignmentService {

    private final AssignmentRepository assignmentRepository;
    private final ActivityRepository activityRepository;
    private final AssignmentMapper assignmentMapper;

    public AssignmentResponse create(AssignmentRequest request) {
        Activity activity = activityRepository.findById(request.getIdActivity())
                .orElseThrow(() -> ResourceNotFoundException.of("Activity", request.getIdActivity()));

        // Ep quan he 1-1: 1 activity chi duoc gan voi 1 assignment
        assignmentRepository.findByActivity_IdActivity(request.getIdActivity())
                .ifPresent(a -> {
                    throw new IllegalStateException("Activity " + request.getIdActivity() + " da co assignment roi");
                });

        Assignment entity = assignmentMapper.toEntity(request);
        entity.setIdAssignment(UUID.randomUUID().toString());
        entity.setActivity(activity);

        return assignmentMapper.toResponse(assignmentRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public AssignmentResponse getById(String id) {
        Assignment entity = assignmentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Assignment", id));
        return assignmentMapper.toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<AssignmentResponse> getAll() {
        return assignmentRepository.findAll().stream().map(assignmentMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public AssignmentResponse getByActivity(String idActivity) {
        Assignment entity = assignmentRepository.findByActivity_IdActivity(idActivity)
                .orElseThrow(() -> ResourceNotFoundException.of("Assignment (by activity)", idActivity));
        return assignmentMapper.toResponse(entity);
    }

    public AssignmentResponse update(String id, AssignmentRequest request) {
        Assignment entity = assignmentRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Assignment", id));

        Activity activity = activityRepository.findById(request.getIdActivity())
                .orElseThrow(() -> ResourceNotFoundException.of("Activity", request.getIdActivity()));

        entity.setName(request.getName());
        entity.setFileTeacher(request.getFileTeacher());
        entity.setDescription(request.getDescription());
        entity.setActivity(activity);

        return assignmentMapper.toResponse(assignmentRepository.save(entity));
    }

    public void delete(String id) {
        if (!assignmentRepository.existsById(id)) {
            throw ResourceNotFoundException.of("Assignment", id);
        }
        assignmentRepository.deleteById(id);
    }
}
