package com.example.demo.repository;

import com.example.demo.entity.StudentAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentAnswerRepository extends JpaRepository<StudentAnswer, String> {
    List<StudentAnswer> findByAttempt_IdAttempt(String idAttempt);
}
