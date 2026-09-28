package com.example.activity.repository;

import com.example.activity.entity.StudentScore;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentScoreRepository extends JpaRepository<StudentScore, String> {

    @Override
    @EntityGraph(attributePaths = {"gradeComponent", "enrollment"})
    List<StudentScore> findAll();

    @Override
    @EntityGraph(attributePaths = {"gradeComponent", "enrollment"})
    Optional<StudentScore> findById(String id);

    boolean existsByEnrollment_EnrollmentIdAndGradeComponent_IdGradeComponents(String enrollmentId, String idGradeComponents);
}
