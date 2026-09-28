package com.example.activity.service;

import com.example.activity.dto.request.StudentScoreRequest;
import com.example.activity.dto.response.StudentScoreResponse;
import com.example.activity.entity.StudentScore;
import com.example.activity.entity.GradeComponent;
import com.example.activity.entity.StudentEnrollment;
import com.example.activity.entity.ClassesGradeComponentId;
import com.example.activity.exception.DuplicateResourceException;
import com.example.activity.exception.ResourceNotFoundException;
import com.example.activity.mapper.StudentScoreMapper;
import com.example.activity.repository.ClassesGradeComponentRepository;
import com.example.activity.repository.StudentScoreRepository;
import com.example.activity.repository.GradeComponentRepository;
import com.example.activity.repository.StudentEnrollmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StudentScoreService {

    private final StudentScoreRepository studentScoreRepository;
    private final GradeComponentRepository gradeComponentRepository;
    private final StudentEnrollmentRepository studentEnrollmentRepository;
    private final ClassesGradeComponentRepository classesGradeComponentRepository;
    private final StudentScoreMapper studentScoreMapper;

    @Transactional(readOnly = true)
    public List<StudentScoreResponse> getAll() {
        return studentScoreRepository.findAll().stream()
                .map(studentScoreMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public StudentScoreResponse getById(String id) {
        return studentScoreMapper.toResponse(findEntity(id));
    }

    @Transactional
    public StudentScoreResponse create(StudentScoreRequest request) {
        if (request.getIdScore() == null || request.getIdScore().isBlank()) {
            throw new IllegalArgumentException("idScore is required");
        }
        if (studentScoreRepository.existsById(request.getIdScore())) {
            throw new DuplicateResourceException("StudentScore already exists with id: " + request.getIdScore());
        }
        if (studentScoreRepository.existsByEnrollment_EnrollmentIdAndGradeComponent_IdGradeComponents(
                request.getEnrollmentId(), request.getIdGradeComponents())) {
            throw new DuplicateResourceException("Score for this grade component already exists for this enrollment");
        }
        StudentEnrollment enrollment = findEnrollment(request.getEnrollmentId());
        validateComponentAssignedToClass(enrollment, request.getIdGradeComponents());

        StudentScore entity = studentScoreMapper.toEntity(request);
        entity.setGradeComponent(findGradeComponent(request.getIdGradeComponents()));
        entity.setEnrollment(enrollment);
        return studentScoreMapper.toResponse(studentScoreRepository.save(entity));
    }

    @Transactional
    public StudentScoreResponse update(String id, StudentScoreRequest request) {
        if (request.getIdScore() != null && !request.getIdScore().isBlank() && !request.getIdScore().equals(id)) {
            throw new IllegalArgumentException("Path variable id and request body idScore do not match");
        }
        StudentScore entity = findEntity(id);
        if (!entity.getEnrollment().getEnrollmentId().equals(request.getEnrollmentId())
                || !entity.getGradeComponent().getIdGradeComponents().equals(request.getIdGradeComponents())) {
            if (studentScoreRepository.existsByEnrollment_EnrollmentIdAndGradeComponent_IdGradeComponents(
                    request.getEnrollmentId(), request.getIdGradeComponents())) {
                throw new DuplicateResourceException("Score for this grade component already exists for this enrollment");
            }
        }
        StudentEnrollment enrollment = findEnrollment(request.getEnrollmentId());
        validateComponentAssignedToClass(enrollment, request.getIdGradeComponents());

        studentScoreMapper.updateEntity(request, entity);
        entity.setGradeComponent(findGradeComponent(request.getIdGradeComponents()));
        entity.setEnrollment(enrollment);
        return studentScoreMapper.toResponse(studentScoreRepository.save(entity));
    }

    private void validateComponentAssignedToClass(StudentEnrollment enrollment, String idGradeComponents) {
        if (enrollment.getClasses() != null) {
            String classId = enrollment.getClasses().getIdClasses();
            ClassesGradeComponentId compId = new ClassesGradeComponentId(classId, idGradeComponents);
            if (!classesGradeComponentRepository.existsById(compId)) {
                throw new IllegalArgumentException("Grade component " + idGradeComponents + " is not assigned to class " + classId);
            }
        }
    }

    @Transactional
    public void delete(String id) {
        if (!studentScoreRepository.existsById(id)) {
            throw new ResourceNotFoundException("StudentScore not found with id: " + id);
        }
        studentScoreRepository.deleteById(id);
    }

    private StudentScore findEntity(String id) {
        return studentScoreRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("StudentScore not found with id: " + id));
    }

    private GradeComponent findGradeComponent(String id) {
        return gradeComponentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("GradeComponent not found with id: " + id));
    }

    private StudentEnrollment findEnrollment(String id) {
        return studentEnrollmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("StudentEnrollment not found with id: " + id));
    }
}
