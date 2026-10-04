package com.example.enrollmentservice.service;

import com.example.enrollmentservice.entity.Course;
import com.example.enrollmentservice.exception.BadRequestException;
import com.example.enrollmentservice.exception.DuplicateResourceException;
import com.example.enrollmentservice.exception.ResourceNotFoundException;
import com.example.enrollmentservice.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CourseService {
    private final CourseRepository courseRepository;

    public List<Course> getAllCourses() {
        return courseRepository.findAll();
    }

    public Course getCourseById(String id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy môn học với mã: " + id));
    }

    public Course createCourse(Course course) {
        if (course.getName() == null || course.getName().trim().isEmpty()) {
            throw new BadRequestException("Tên môn học không được để trống.");
        }
        if (course.getCredits() != null && course.getCredits() < 0) {
            throw new BadRequestException("Số tín chỉ của môn học không được âm.");
        }
        if (course.getCourseId() != null && courseRepository.existsById(course.getCourseId())) {
            throw new DuplicateResourceException("Mã môn học đã tồn tại: " + course.getCourseId());
        }
        return courseRepository.save(course);
    }

    public Course updateCourse(String id, Course course) {
        if (!courseRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy môn học với mã: " + id);
        }
        if (course.getName() == null || course.getName().trim().isEmpty()) {
            throw new BadRequestException("Tên môn học không được để trống.");
        }
        if (course.getCredits() != null && course.getCredits() < 0) {
            throw new BadRequestException("Số tín chỉ của môn học không được âm.");
        }
        course.setCourseId(id);
        return courseRepository.save(course);
    }

    public void deleteCourse(String id) {
        if (!courseRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy môn học với mã: " + id);
        }
        courseRepository.deleteById(id);
    }
}
