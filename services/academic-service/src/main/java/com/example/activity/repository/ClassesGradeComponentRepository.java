package com.example.activity.repository;

import com.example.activity.entity.ClassesGradeComponent;
import com.example.activity.entity.ClassesGradeComponentId;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassesGradeComponentRepository extends JpaRepository<ClassesGradeComponent, ClassesGradeComponentId> {

    @Override
    @EntityGraph(attributePaths = {"classes", "gradeComponent"})
    List<ClassesGradeComponent> findAll();

    @Override
    @EntityGraph(attributePaths = {"classes", "gradeComponent"})
    Optional<ClassesGradeComponent> findById(ClassesGradeComponentId id);

    @EntityGraph(attributePaths = {"classes", "gradeComponent"})
    List<ClassesGradeComponent> findByClasses_IdClasses(String idClasses);
}
