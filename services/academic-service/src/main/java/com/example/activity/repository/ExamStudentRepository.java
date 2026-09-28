package com.example.activity.repository;

import com.example.activity.entity.ExamStudent;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExamStudentRepository extends JpaRepository<ExamStudent, Integer> {

    @Override
    @EntityGraph(attributePaths = {"examSchedule"})
    List<ExamStudent> findAll();

    boolean existsByExamSchedule_ExamIdAndStudentId(String examId, String studentId);

    long countByExamSchedule_ExamId(String examId);
}
