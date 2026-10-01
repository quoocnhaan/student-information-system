package com.example.demo.service;

import com.example.demo.dto.request.AssignmentStudentApproveRequest;
import com.example.demo.dto.response.AssignmentStudentApproveResponse;
import com.example.demo.entity.Assignment;
import com.example.demo.entity.AssignmentStudentApprove;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.AssignmentStudentApproveMapper;
import com.example.demo.repository.AssignmentRepository;
import com.example.demo.repository.AssignmentStudentApproveRepository;
import lombok.RequiredArgsConstructor;
import com.example.demo.security.SecurityUtils;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AssignmentStudentApproveService {

    private final AssignmentStudentApproveRepository assignmentStudentApproveRepository;
    private final AssignmentRepository assignmentRepository;
    private final AssignmentStudentApproveMapper mapper;

    public AssignmentStudentApproveResponse create(AssignmentStudentApproveRequest request) {
        if (SecurityUtils.isCurrentUserStudent()) {
            String currentUsername = SecurityUtils.getCurrentUsername();
            if (request.getIdStudent() != null && !request.getIdStudent().isBlank() && !request.getIdStudent().equals(currentUsername)) {
                throw new AccessDeniedException("Access Denied: You cannot submit assignment for another student");
            }
            if (request.getIdStudent() == null || request.getIdStudent().isBlank()) {
                request.setIdStudent(currentUsername);
            }
        }

        Assignment assignment = assignmentRepository.findById(request.getIdAssignment())
                .orElseThrow(() -> ResourceNotFoundException.of("Assignment", request.getIdAssignment()));

        AssignmentStudentApprove entity = mapper.toEntity(request);
        entity.setIdAssignmentStudentApprove(UUID.randomUUID().toString());
        entity.setAssignment(assignment);

        return mapper.toResponse(assignmentStudentApproveRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public AssignmentStudentApproveResponse getById(String id) {
        AssignmentStudentApprove entity = assignmentStudentApproveRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("AssignmentStudentApprove", id));
        SecurityUtils.checkStudentAccess(entity.getIdStudent(), "view assignment submission");
        return mapper.toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<AssignmentStudentApproveResponse> getAll() {
        if (SecurityUtils.isCurrentUserStudent()) {
            return assignmentStudentApproveRepository.findByIdStudent(SecurityUtils.getCurrentUsername()).stream()
                    .map(mapper::toResponse).toList();
        }
        return assignmentStudentApproveRepository.findAll().stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AssignmentStudentApproveResponse> getByAssignment(String idAssignment) {
        if (SecurityUtils.isCurrentUserStudent()) {
            return assignmentStudentApproveRepository.findByAssignment_IdAssignmentAndIdStudent(idAssignment, SecurityUtils.getCurrentUsername()).stream()
                    .map(mapper::toResponse).toList();
        }
        return assignmentStudentApproveRepository.findByAssignment_IdAssignment(idAssignment).stream()
                .map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AssignmentStudentApproveResponse> getByStudent(String idStudent) {
        SecurityUtils.checkStudentAccess(idStudent, "view assignment submissions");
        return assignmentStudentApproveRepository.findByIdStudent(idStudent).stream()
                .map(mapper::toResponse).toList();
    }

    public AssignmentStudentApproveResponse update(String id, AssignmentStudentApproveRequest request) {
        AssignmentStudentApprove entity = assignmentStudentApproveRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("AssignmentStudentApprove", id));
        SecurityUtils.checkStudentAccess(entity.getIdStudent(), "update assignment submission");
        if (SecurityUtils.isCurrentUserStudent()) {
            SecurityUtils.checkStudentAccess(request.getIdStudent(), "update assignment submission");
        }

        Assignment assignment = assignmentRepository.findById(request.getIdAssignment())
                .orElseThrow(() -> ResourceNotFoundException.of("Assignment", request.getIdAssignment()));

        entity.setIdStudent(request.getIdStudent());
        entity.setSubmitFile(request.getSubmitFile());
        entity.setAssignment(assignment);

        return mapper.toResponse(assignmentStudentApproveRepository.save(entity));
    }

    public void delete(String id) {
        if (!assignmentStudentApproveRepository.existsById(id)) {
            throw ResourceNotFoundException.of("AssignmentStudentApprove", id);
        }
        assignmentStudentApproveRepository.deleteById(id);
    }
}
