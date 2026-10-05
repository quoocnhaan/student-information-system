package com.example.activity.service;

import com.example.activity.dto.request.ClassesRequest;
import com.example.activity.dto.response.ClassesResponse;
import com.example.activity.entity.Classes;
import com.example.activity.entity.Course;
import com.example.activity.entity.Semester;
import com.example.activity.exception.DuplicateResourceException;
import com.example.activity.exception.ResourceNotFoundException;
import com.example.activity.mapper.ClassesMapper;
import com.example.activity.repository.ClassesRepository;
import com.example.activity.repository.CourseRepository;
import com.example.activity.repository.SemesterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClassesService {

    private final ClassesRepository classesRepository;
    private final CourseRepository courseRepository;
    private final SemesterRepository semesterRepository;
    private final ClassesMapper classesMapper;

    @Transactional(readOnly = true)
    public List<ClassesResponse> getAll() {
        return classesRepository.findAll().stream()
                .map(classesMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ClassesResponse getById(String id) {
        return classesMapper.toResponse(findEntity(id));
    }

    @Transactional
    public ClassesResponse create(ClassesRequest request) {
        if (request.getIdClasses() == null || request.getIdClasses().isBlank()) {
            throw new IllegalArgumentException("idClasses is required");
        }
        if (classesRepository.existsById(request.getIdClasses())) {
            throw new DuplicateResourceException("Classes already exists with id: " + request.getIdClasses());
        }
        Classes entity = classesMapper.toEntity(request);
        entity.setCourse(findCourse(request.getCourseId()));
        entity.setSemester(findSemester(request.getSemesterId()));
        return classesMapper.toResponse(classesRepository.save(entity));
    }

    @Transactional
    public ClassesResponse update(String id, ClassesRequest request) {
        if (request.getIdClasses() != null && !request.getIdClasses().isBlank() && !request.getIdClasses().equals(id)) {
            throw new IllegalArgumentException("Path variable id and request body idClasses do not match");
        }
        Classes entity = findEntity(id);
        classesMapper.updateEntity(request, entity);
        entity.setCourse(findCourse(request.getCourseId()));
        entity.setSemester(findSemester(request.getSemesterId()));
        return classesMapper.toResponse(classesRepository.save(entity));
    }

    @Transactional
    public void delete(String id) {
        if (!classesRepository.existsById(id)) {
            throw new ResourceNotFoundException("Classes not found with id: " + id);
        }
        classesRepository.deleteById(id);
    }

    private Classes findEntity(String id) {
        return classesRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Classes not found with id: " + id));
    }

    private Course findCourse(String id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + id));
    }

    private Semester findSemester(String id) {
        return semesterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Semester not found with id: " + id));
    }
}
