package com.example.demo.repository;

import com.example.demo.entity.AssignmentStudentApprove;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssignmentStudentApproveRepository extends JpaRepository<AssignmentStudentApprove, String> {
    List<AssignmentStudentApprove> findByAssignment_IdAssignment(String idAssignment);
    List<AssignmentStudentApprove> findByIdStudent(String idStudent);
    List<AssignmentStudentApprove> findByAssignment_IdAssignmentAndIdStudent(String idAssignment, String idStudent);
}
