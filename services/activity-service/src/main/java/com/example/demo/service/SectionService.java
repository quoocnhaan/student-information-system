package com.example.demo.service;

import com.example.demo.dto.request.SectionRequest;
import com.example.demo.dto.response.SectionResponse;
import com.example.demo.entity.Classes;
import com.example.demo.entity.Section;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.SectionMapper;
import com.example.demo.repository.ClassesRepository;
import com.example.demo.repository.SectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class SectionService {

    private final SectionRepository sectionRepository;
    private final ClassesRepository classesRepository;
    private final SectionMapper sectionMapper;

    public SectionResponse create(SectionRequest request) {
        Classes classes = classesRepository.findById(request.getIdClasses())
                .orElseThrow(() -> ResourceNotFoundException.of("Classes", request.getIdClasses()));

        Section entity = sectionMapper.toEntity(request);
        entity.setIdSection(UUID.randomUUID().toString());
        entity.setClasses(classes);

        return sectionMapper.toResponse(sectionRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public SectionResponse getById(String id) {
        Section entity = sectionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Section", id));
        return sectionMapper.toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<SectionResponse> getAll() {
        return sectionRepository.findAll().stream().map(sectionMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<SectionResponse> getByClasses(String idClasses) {
        return sectionRepository.findByClasses_IdClasses(idClasses).stream()
                .map(sectionMapper::toResponse).toList();
    }

    public SectionResponse update(String id, SectionRequest request) {
        Section entity = sectionRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Section", id));

        Classes classes = classesRepository.findById(request.getIdClasses())
                .orElseThrow(() -> ResourceNotFoundException.of("Classes", request.getIdClasses()));

        entity.setName(request.getName());
        entity.setClasses(classes);

        return sectionMapper.toResponse(sectionRepository.save(entity));
    }

    public void delete(String id) {
        if (!sectionRepository.existsById(id)) {
            throw ResourceNotFoundException.of("Section", id);
        }
        sectionRepository.deleteById(id);
    }
}
