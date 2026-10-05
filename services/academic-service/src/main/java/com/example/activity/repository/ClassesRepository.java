package com.example.activity.repository;

import com.example.activity.entity.Classes;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassesRepository extends JpaRepository<Classes, String> {

    @Override
    @EntityGraph(attributePaths = {"course", "semester"})
    List<Classes> findAll();

    @Override
    @EntityGraph(attributePaths = {"course", "semester"})
    Optional<Classes> findById(String id);
}
