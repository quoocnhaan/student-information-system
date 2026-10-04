package com.example.activity.repository;

import com.example.activity.entity.Major;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MajorRepository extends JpaRepository<Major, String> {

    @Override
    @EntityGraph(attributePaths = {"faculty"})
    List<Major> findAll();

    @Override
    @EntityGraph(attributePaths = {"faculty"})
    Optional<Major> findById(String id);
}
