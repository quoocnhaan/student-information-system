package com.example.demo.repository;

import com.example.demo.entity.Assignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AssignmentRepository extends JpaRepository<Assignment, String> {
    Optional<Assignment> findByActivity_IdActivity(String idActivity);
}
