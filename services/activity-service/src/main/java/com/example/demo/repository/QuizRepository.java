package com.example.demo.repository;

import com.example.demo.entity.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface QuizRepository extends JpaRepository<Quiz, String> {
    Optional<Quiz> findByActivity_IdActivity(String idActivity);
}
