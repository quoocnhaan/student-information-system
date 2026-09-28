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
        return mapper.toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<AssignmentStudentApproveResponse> getAll() {
        return assignmentStudentApproveRepository.findAll().stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AssignmentStudentApproveResponse> getByAssignment(String idAssignment) {
        return assignmentStudentApproveRepository.findByAssignment_IdAssignment(idAssignment).stream()
                .map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AssignmentStudentApproveResponse> getByStudent(String idStudent) {
        return assignmentStudentApproveRepository.findByIdStudent(idStudent).stream()
                .map(mapper::toResponse).toList();
    }

    public AssignmentStudentApproveResponse update(String id, AssignmentStudentApproveRequest request) {
        AssignmentStudentApprove entity = assignmentStudentApproveRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("AssignmentStudentApprove", id));

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
