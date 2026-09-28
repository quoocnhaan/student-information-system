package com.example.activity.repository;

import com.example.activity.entity.GradeComponent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface GradeComponentRepository extends JpaRepository<GradeComponent, String> {
}
