package com.example.activity.service;

import com.example.activity.dto.request.CourseRequest;
import com.example.activity.dto.response.CourseResponse;
import com.example.activity.entity.Course;
import com.example.activity.entity.Major;
import com.example.activity.exception.DuplicateResourceException;
import com.example.activity.exception.ResourceNotFoundException;
import com.example.activity.mapper.CourseMapper;
import com.example.activity.repository.CourseRepository;
import com.example.activity.repository.MajorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CourseService {

    private final CourseRepository courseRepository;
    private final MajorRepository majorRepository;
    private final CourseMapper courseMapper;

    @Transactional(readOnly = true)
    public List<CourseResponse> getAll() {
        return courseRepository.findAll().stream()
                .map(courseMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CourseResponse getById(String id) {
        return courseMapper.toResponse(findEntity(id));
    }

    @Transactional
    public CourseResponse create(CourseRequest request) {
        if (request.getIdCourse() == null || request.getIdCourse().isBlank()) {
            throw new IllegalArgumentException("idCourse is required");
        }
        if (courseRepository.existsById(request.getIdCourse())) {
            throw new DuplicateResourceException("Course already exists with id: " + request.getIdCourse());
        }
        Course entity = courseMapper.toEntity(request);
        entity.setMajor(findMajor(request.getMajorId()));
        return courseMapper.toResponse(courseRepository.save(entity));
    }

    @Transactional
    public CourseResponse update(String id, CourseRequest request) {
        if (request.getIdCourse() != null && !request.getIdCourse().isBlank() && !request.getIdCourse().equals(id)) {
            throw new IllegalArgumentException("Path variable id and request body idCourse do not match");
        }
        Course entity = findEntity(id);
        courseMapper.updateEntity(request, entity);
        entity.setMajor(findMajor(request.getMajorId()));
        return courseMapper.toResponse(courseRepository.save(entity));
    }

    @Transactional
    public void delete(String id) {
        if (!courseRepository.existsById(id)) {
            throw new ResourceNotFoundException("Course not found with id: " + id);
        }
        courseRepository.deleteById(id);
    }

    private Course findEntity(String id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Course not found with id: " + id));
    }

    private Major findMajor(String id) {
        return majorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Major not found with id: " + id));
    }
}
