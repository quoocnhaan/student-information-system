package com.example.enrollmentservice.service;

import com.example.enrollmentservice.entity.RegistrationPeriod;
import com.example.enrollmentservice.repository.RegistrationPeriodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RegistrationPeriodService {
    private final RegistrationPeriodRepository periodRepository;

    public List<RegistrationPeriod> getAllPeriods() { return periodRepository.findAll(); }
    public RegistrationPeriod getPeriodById(String id) { return periodRepository.findById(id).orElse(null); }
    public RegistrationPeriod savePeriod(RegistrationPeriod period) { return periodRepository.save(period); }
    public void deletePeriod(String id) { periodRepository.deleteById(id); }
}
