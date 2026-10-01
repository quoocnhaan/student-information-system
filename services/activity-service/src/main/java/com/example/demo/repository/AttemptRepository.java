package com.example.demo.repository;

import com.example.demo.entity.Attempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttemptRepository extends JpaRepository<Attempt, String> {
    List<Attempt> findByQuiz_IdQuiz(String idQuiz);
    List<Attempt> findByIdStudent(String idStudent);
    long countByQuiz_IdQuizAndIdStudent(String idQuiz, String idStudent);
    List<Attempt> findByQuiz_IdQuizAndIdStudent(String idQuiz, String idStudent);
}
