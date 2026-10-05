package com.example.enrollmentservice.repository;

import com.example.enrollmentservice.entity.EnrollmentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EnrollmentHistoryRepository extends JpaRepository<EnrollmentHistory, String> {
    void deleteByEnrollment_EnrollmentId(String enrollmentId);
    List<EnrollmentHistory> findByEnrollment_StudentId(String studentId);
}
