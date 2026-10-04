package com.example.enrollmentservice.service;

import com.example.enrollmentservice.entity.EnrollmentHistory;
import com.example.enrollmentservice.repository.EnrollmentHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EnrollmentHistoryService {
    private final EnrollmentHistoryRepository historyRepository;

    public List<EnrollmentHistory> getAllHistories() { return historyRepository.findAll(); }
    public EnrollmentHistory getHistoryById(String id) { return historyRepository.findById(id).orElse(null); }
    public EnrollmentHistory saveHistory(EnrollmentHistory history) { return historyRepository.save(history); }
    public void deleteHistory(String id) { historyRepository.deleteById(id); }
}
