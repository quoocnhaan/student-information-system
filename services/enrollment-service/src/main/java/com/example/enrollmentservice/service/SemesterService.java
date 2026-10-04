package com.example.enrollmentservice.service;

import com.example.enrollmentservice.entity.Semester;
import com.example.enrollmentservice.repository.SemesterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SemesterService {
    private final SemesterRepository semesterRepository;

    public List<Semester> getAllSemesters() { return semesterRepository.findAll(); }
    public Semester getSemesterById(String id) { return semesterRepository.findById(id).orElse(null); }
    public Semester saveSemester(Semester semester) { return semesterRepository.save(semester); }
    public void deleteSemester(String id) { semesterRepository.deleteById(id); }
}
