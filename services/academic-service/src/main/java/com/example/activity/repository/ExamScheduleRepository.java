package com.example.activity.repository;

import com.example.activity.entity.ExamSchedule;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExamScheduleRepository extends JpaRepository<ExamSchedule, String> {

    @Override
    @EntityGraph(attributePaths = {"semester", "classes"})
    List<ExamSchedule> findAll();

    @Override
    @EntityGraph(attributePaths = {"semester", "classes"})
    Optional<ExamSchedule> findById(String id);
}
