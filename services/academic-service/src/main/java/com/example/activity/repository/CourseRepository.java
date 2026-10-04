package com.example.activity.repository;

import com.example.activity.entity.Course;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CourseRepository extends JpaRepository<Course, String> {

    @Override
    @EntityGraph(attributePaths = {"major"})
    List<Course> findAll();

    @Override
    @EntityGraph(attributePaths = {"major"})
    Optional<Course> findById(String id);
}
