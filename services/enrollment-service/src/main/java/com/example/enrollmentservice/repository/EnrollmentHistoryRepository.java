package com.example.enrollmentservice.repository;

import com.example.enrollmentservice.entity.EnrollmentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EnrollmentHistoryRepository extends JpaRepository<EnrollmentHistory, String> {
}
