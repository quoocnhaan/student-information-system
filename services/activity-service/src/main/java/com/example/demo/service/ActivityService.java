package com.example.demo.service;

import com.example.demo.dto.request.ActivityRequest;
import com.example.demo.dto.response.ActivityResponse;
import com.example.demo.entity.Activity;
import com.example.demo.entity.Section;
import com.example.demo.exception.ResourceNotFoundException;
import com.example.demo.mapper.ActivityMapper;
import com.example.demo.repository.ActivityRepository;
import com.example.demo.repository.SectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ActivityService {

    private final ActivityRepository activityRepository;
    private final SectionRepository sectionRepository;
    private final ActivityMapper activityMapper;

    public ActivityResponse create(ActivityRequest request) {
        Section section = sectionRepository.findById(request.getIdSection())
                .orElseThrow(() -> ResourceNotFoundException.of("Section", request.getIdSection()));

        Activity entity = activityMapper.toEntity(request);
        entity.setIdActivity(UUID.randomUUID().toString());
        entity.setSection(section);

        return activityMapper.toResponse(activityRepository.save(entity));
    }

    @Transactional(readOnly = true)
    public ActivityResponse getById(String id) {
        Activity entity = activityRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Activity", id));
        return activityMapper.toResponse(entity);
    }

    @Transactional(readOnly = true)
    public List<ActivityResponse> getAll() {
        return activityRepository.findAll().stream().map(activityMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ActivityResponse> getBySection(String idSection) {
        return activityRepository.findBySection_IdSection(idSection).stream()
                .map(activityMapper::toResponse).toList();
    }

    public ActivityResponse update(String id, ActivityRequest request) {
        Activity entity = activityRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.of("Activity", id));

        Section section = sectionRepository.findById(request.getIdSection())
                .orElseThrow(() -> ResourceNotFoundException.of("Section", request.getIdSection()));

        entity.setName(request.getName());
        entity.setType(request.getType());
        entity.setTimeOpen(request.getTimeOpen());
        entity.setTimeClose(request.getTimeClose());
        entity.setSection(section);

        return activityMapper.toResponse(activityRepository.save(entity));
    }

    public void delete(String id) {
        if (!activityRepository.existsById(id)) {
            throw ResourceNotFoundException.of("Activity", id);
        }
        activityRepository.deleteById(id);
    }
}
