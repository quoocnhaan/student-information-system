package com.example.demo.service;

import com.example.demo.dto.request.ClassesRequest;
import com.example.demo.dto.response.ClassesResponse;
import com.example.demo.entity.Classes;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.ClassesMapper;
import com.example.demo.repository.ClassesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class ClassesService {

    private final ClassesRepository classesRepository;
    private final ClassesMapper classesMapper;

    public ClassesResponse create(ClassesRequest request) {
        Classes entity = classesMapper.toEntity(request);
        return classesMapper.toResponse(classesRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public ClassesResponse getById(String id) {
        Classes entity = classesRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Classes", id));
        return classesMapper.toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<ClassesResponse> getAll() {
        return classesRepository.findAll().stream().map(classesMapper::toResponse).toList();
    }

    public ClassesResponse update(String id, ClassesRequest request) {
        Classes entity = classesRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Classes", id));
        // idClasses la khoa chinh, khong cho phep doi id trong luc update
        return classesMapper.toResponse(classesRepository.save(entity));
    }

    public void delete(String id) {
        if (!classesRepository.existsById(id)) {
            throw ResourceNotFoundException.of("Classes", id);
        }
        classesRepository.deleteById(id);
    }
}
