package com.example.enrollmentservice.repository;

import com.example.enrollmentservice.entity.ClassEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClassRepository extends JpaRepository<ClassEntity, String> {
    // Tự động generate câu truy vấn: SELECT * FROM classes WHERE semester_id = ?
    List<ClassEntity> findBySemesterId(String semesterId);
}