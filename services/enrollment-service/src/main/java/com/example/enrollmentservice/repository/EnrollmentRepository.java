package com.example.enrollmentservice.repository;

import com.example.enrollmentservice.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, String> {
    boolean existsByStudentIdAndCourseClass_ClassId(String studentId, String classId);
    boolean existsByStudentIdAndCourseClass_ClassIdAndStatus(String studentId, String classId, String status);
    List<Enrollment> findByStudentId(String studentId);
    Optional<Enrollment> findByEnrollmentIdAndStudentId(String enrollmentId, String studentId);
}
