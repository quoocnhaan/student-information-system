package com.example.demo.repository;

import com.example.demo.entity.StudentAnswer;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentAnswerRepository extends JpaRepository<StudentAnswer, String> {
    @EntityGraph(attributePaths = {"question", "option"})
    List<StudentAnswer> findByAttempt_IdAttempt(String idAttempt);

    List<StudentAnswer> findByAttempt_IdStudent(String idStudent);

    boolean existsByAttempt_IdAttemptAndQuestion_IdQuestion(String idAttempt, String idQuestion);

    boolean existsByAttempt_IdAttemptAndQuestion_IdQuestionAndIdSaNot(String idAttempt, String idQuestion, String idSa);
}
