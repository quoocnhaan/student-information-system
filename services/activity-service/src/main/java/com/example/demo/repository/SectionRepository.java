package com.example.demo.repository;

import com.example.demo.entity.Section;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SectionRepository extends JpaRepository<Section, String> {
    List<Section> findByClasses_IdClasses(String idClasses);
    boolean existsByClasses_IdClasses(String idClasses);
}
