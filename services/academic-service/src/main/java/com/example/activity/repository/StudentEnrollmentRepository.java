package com.example.activity.repository;

import com.example.activity.entity.StudentEnrollment;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentEnrollmentRepository extends JpaRepository<StudentEnrollment, String> {

    @Override
    @EntityGraph(attributePaths = {"classes"})
    List<StudentEnrollment> findAll();

    @Override
    @EntityGraph(attributePaths = {"classes"})
    Optional<StudentEnrollment> findById(String id);

    boolean existsByClasses_IdClassesAndStudentId(String idClasses, String studentId);

    long countByClasses_IdClasses(String idClasses);

    @EntityGraph(attributePaths = {"classes"})
    List<StudentEnrollment> findByStudentId(String studentId);
}
