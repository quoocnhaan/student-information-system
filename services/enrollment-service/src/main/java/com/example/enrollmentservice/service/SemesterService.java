package com.example.enrollmentservice.service;

import com.example.enrollmentservice.entity.Semester;
import com.example.enrollmentservice.exception.BadRequestException;
import com.example.enrollmentservice.exception.DuplicateResourceException;
import com.example.enrollmentservice.exception.ResourceNotFoundException;
import com.example.enrollmentservice.repository.SemesterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SemesterService {
    private final SemesterRepository semesterRepository;

    public List<Semester> getAllSemesters() {
        return semesterRepository.findAll();
    }

    public Semester getSemesterById(String id) {
        return semesterRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy học kỳ với mã: " + id));
    }

    public Semester createSemester(Semester semester) {
        if (semester.getStartDate() != null && semester.getEndDate() != null
                && semester.getEndDate().isBefore(semester.getStartDate())) {
            throw new BadRequestException("Ngày kết thúc học kỳ không thể trước ngày bắt đầu.");
        }
        if (semester.getSemesterId() != null && semesterRepository.existsById(semester.getSemesterId())) {
            throw new DuplicateResourceException("Mã học kỳ đã tồn tại: " + semester.getSemesterId());
        }
        return semesterRepository.save(semester);
    }

    public Semester updateSemester(String id, Semester semester) {
        if (!semesterRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy học kỳ với mã: " + id);
        }
        if (semester.getStartDate() != null && semester.getEndDate() != null
                && semester.getEndDate().isBefore(semester.getStartDate())) {
            throw new BadRequestException("Ngày kết thúc học kỳ không thể trước ngày bắt đầu.");
        }
        semester.setSemesterId(id);
        return semesterRepository.save(semester);
    }

    public void deleteSemester(String id) {
        if (!semesterRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy học kỳ với mã: " + id);
        }
        semesterRepository.deleteById(id);
    }
}
