package com.example.demo.repository;

import com.example.demo.entity.QuestionOption;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface QuestionOptionRepository extends JpaRepository<QuestionOption, String> {
    List<QuestionOption> findByQuestion_IdQuestion(String idQuestion);
}
