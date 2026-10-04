package com.example.activity.service;

import com.example.activity.dto.request.ClassesGradeComponentRequest;
import com.example.activity.dto.response.ClassesGradeComponentResponse;
import com.example.activity.entity.Classes;
import com.example.activity.entity.ClassesGradeComponent;
import com.example.activity.entity.ClassesGradeComponentId;
import com.example.activity.entity.GradeComponent;
import com.example.activity.exception.DuplicateResourceException;
import com.example.activity.exception.ResourceNotFoundException;
import com.example.activity.mapper.ClassesGradeComponentMapper;
import com.example.activity.repository.ClassesGradeComponentRepository;
import com.example.activity.repository.ClassesRepository;
import com.example.activity.repository.GradeComponentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ClassesGradeComponentService {

    private final ClassesGradeComponentRepository classesGradeComponentRepository;
    private final ClassesRepository classesRepository;
    private final GradeComponentRepository gradeComponentRepository;
    private final ClassesGradeComponentMapper classesGradeComponentMapper;

    @Transactional(readOnly = true)
    public List<ClassesGradeComponentResponse> getAll() {
        return classesGradeComponentRepository.findAll().stream()
                .map(classesGradeComponentMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ClassesGradeComponentResponse> getByClassId(String idClasses) {
        return classesGradeComponentRepository.findByClasses_IdClasses(idClasses).stream()
                .map(classesGradeComponentMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ClassesGradeComponentResponse getById(String idClasses, String idGradeComponents) {
        ClassesGradeComponentId id = new ClassesGradeComponentId(idClasses, idGradeComponents);
        return classesGradeComponentRepository.findById(id)
                .map(classesGradeComponentMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Grade component " + idGradeComponents + " is not assigned to class " + idClasses));
    }

    @Transactional
    public ClassesGradeComponentResponse create(ClassesGradeComponentRequest request) {
        ClassesGradeComponentId id = new ClassesGradeComponentId(request.getIdClasses(), request.getIdGradeComponents());
        if (classesGradeComponentRepository.existsById(id)) {
            throw new DuplicateResourceException("Grade component already assigned to this class");
        }
        Classes classes = classesRepository.findById(request.getIdClasses())
                .orElseThrow(() -> new ResourceNotFoundException("Classes not found with id: " + request.getIdClasses()));
        GradeComponent gradeComponent = gradeComponentRepository.findById(request.getIdGradeComponents())
                .orElseThrow(() -> new ResourceNotFoundException("GradeComponent not found with id: " + request.getIdGradeComponents()));

        java.math.BigDecimal currentTotal = classesGradeComponentRepository.findByClasses_IdClasses(request.getIdClasses()).stream()
                .map(c -> c.getGradeComponent().getWeightPercentage())
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);
        java.math.BigDecimal newTotal = currentTotal.add(gradeComponent.getWeightPercentage());
        if (newTotal.compareTo(new java.math.BigDecimal("100.0")) > 0) {
            throw new IllegalArgumentException("Total weight percentage of grade components for this class cannot exceed 100%. Current: "
                    + currentTotal + "%, adding: " + gradeComponent.getWeightPercentage() + "% would be: " + newTotal + "%");
        }

        ClassesGradeComponent entity = new ClassesGradeComponent();
        entity.setId(id);
        entity.setClasses(classes);
        entity.setGradeComponent(gradeComponent);
        return classesGradeComponentMapper.toResponse(classesGradeComponentRepository.save(entity));
    }

    @Transactional
    public void delete(String idClasses, String idGradeComponents) {
        ClassesGradeComponentId id = new ClassesGradeComponentId(idClasses, idGradeComponents);
        if (!classesGradeComponentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Grade component is not assigned to this class");
        }
        classesGradeComponentRepository.deleteById(id);
    }
}
