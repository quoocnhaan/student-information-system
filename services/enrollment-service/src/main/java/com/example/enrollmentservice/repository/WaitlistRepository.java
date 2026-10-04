package com.example.enrollmentservice.repository;

import com.example.enrollmentservice.entity.Waitlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WaitlistRepository extends JpaRepository<Waitlist, String> {
    boolean existsByStudentIdAndCourseClass_ClassId(String studentId, String classId);
    List<Waitlist> findByStudentId(String studentId);

    @Query("SELECT COALESCE(MAX(w.position), 0) FROM Waitlist w WHERE w.courseClass.classId = :classId")
    Integer findMaxPositionByClassId(@Param("classId") String classId);
}
