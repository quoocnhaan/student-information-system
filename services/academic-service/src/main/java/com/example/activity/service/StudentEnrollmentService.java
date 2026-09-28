package com.example.activity.service;

import com.example.activity.dto.request.StudentEnrollmentRequest;
import com.example.activity.dto.response.StudentEnrollmentResponse;
import com.example.activity.entity.StudentEnrollment;
import com.example.activity.entity.Classes;
import com.example.activity.exception.DuplicateResourceException;
import com.example.activity.exception.ResourceNotFoundException;
import com.example.activity.mapper.StudentEnrollmentMapper;
import com.example.activity.repository.StudentEnrollmentRepository;
import com.example.activity.repository.ClassesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StudentEnrollmentService {

    private final StudentEnrollmentRepository studentEnrollmentRepository;
    private final ClassesRepository classesRepository;
    private final StudentEnrollmentMapper studentEnrollmentMapper;

    @Transactional(readOnly = true)
    public List<StudentEnrollmentResponse> getAll() {
        return studentEnrollmentRepository.findAll().stream()
                .map(studentEnrollmentMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public StudentEnrollmentResponse getById(String id) {
        return studentEnrollmentMapper.toResponse(findEntity(id));
    }

    @Transactional
    public StudentEnrollmentResponse create(StudentEnrollmentRequest request) {
        if (request.getEnrollmentId() == null || request.getEnrollmentId().isBlank()) {
            throw new IllegalArgumentException("enrollmentId is required");
        }
        if (studentEnrollmentRepository.existsById(request.getEnrollmentId())) {
            throw new DuplicateResourceException("StudentEnrollment already exists with id: " + request.getEnrollmentId());
        }
        if (studentEnrollmentRepository.existsByClasses_IdClassesAndStudentId(request.getIdClasses(), request.getStudentId())) {
            throw new DuplicateResourceException("Student is already enrolled in this class");
        }
        Classes classes = findClasses(request.getIdClasses());
        if (classes.getCapacity() != null && studentEnrollmentRepository.countByClasses_IdClasses(request.getIdClasses()) >= classes.getCapacity()) {
            throw new IllegalArgumentException("Class is already full (capacity: " + classes.getCapacity() + ")");
        }
        StudentEnrollment entity = studentEnrollmentMapper.toEntity(request);
        entity.setClasses(classes);
        return studentEnrollmentMapper.toResponse(studentEnrollmentRepository.save(entity));
    }

    @Transactional
    public StudentEnrollmentResponse update(String id, StudentEnrollmentRequest request) {
        if (request.getEnrollmentId() != null && !request.getEnrollmentId().isBlank() && !request.getEnrollmentId().equals(id)) {
            throw new IllegalArgumentException("Path variable id and request body enrollmentId do not match");
        }
        StudentEnrollment entity = findEntity(id);
        if (!entity.getClasses().getIdClasses().equals(request.getIdClasses()) || !entity.getStudentId().equals(request.getStudentId())) {
            if (studentEnrollmentRepository.existsByClasses_IdClassesAndStudentId(request.getIdClasses(), request.getStudentId())) {
                throw new DuplicateResourceException("Student is already enrolled in this class");
            }
        }
        Classes classes = findClasses(request.getIdClasses());
        studentEnrollmentMapper.updateEntity(request, entity);
        entity.setClasses(classes);
        return studentEnrollmentMapper.toResponse(studentEnrollmentRepository.save(entity));
    }

    @Transactional
    public void delete(String id) {
        if (!studentEnrollmentRepository.existsById(id)) {
            throw new ResourceNotFoundException("StudentEnrollment not found with id: " + id);
        }
        studentEnrollmentRepository.deleteById(id);
    }

    private StudentEnrollment findEntity(String id) {
        return studentEnrollmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("StudentEnrollment not found with id: " + id));
    }

    private Classes findClasses(String id) {
        return classesRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Classes not found with id: " + id));
    }
}
