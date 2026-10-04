package com.example.enrollmentservice.service;

import com.example.enrollmentservice.entity.Course;
import com.example.enrollmentservice.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CourseService {
    private final CourseRepository courseRepository;

    public List<Course> getAllCourses() { return courseRepository.findAll(); }
    public Course getCourseById(String id) { return courseRepository.findById(id).orElse(null); }
    public Course saveCourse(Course course) { return courseRepository.save(course); }
    public void deleteCourse(String id) { courseRepository.deleteById(id); }
}
