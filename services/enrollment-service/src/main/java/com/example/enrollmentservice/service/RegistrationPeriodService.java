package com.example.enrollmentservice.service;

import com.example.enrollmentservice.entity.RegistrationPeriod;
import com.example.enrollmentservice.exception.BadRequestException;
import com.example.enrollmentservice.exception.DuplicateResourceException;
import com.example.enrollmentservice.exception.ResourceNotFoundException;
import com.example.enrollmentservice.repository.RegistrationPeriodRepository;
import com.example.enrollmentservice.repository.SemesterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RegistrationPeriodService {
    private final RegistrationPeriodRepository periodRepository;
    private final SemesterRepository semesterRepository;

    public List<RegistrationPeriod> getAllPeriods() {
        return periodRepository.findAll();
    }

    public RegistrationPeriod getPeriodById(String id) {
        return periodRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đợt đăng ký với mã: " + id));
    }

    public RegistrationPeriod createPeriod(RegistrationPeriod period) {
        if (period.getSemester() != null && period.getSemester().getSemesterId() != null) {
            if (!semesterRepository.existsById(period.getSemester().getSemesterId())) {
                throw new ResourceNotFoundException("Không tìm thấy học kỳ với mã: " + period.getSemester().getSemesterId());
            }
        }
        if (period.getStartTime() != null && period.getEndTime() != null
                && period.getEndTime().isBefore(period.getStartTime())) {
            throw new BadRequestException("Thời gian kết thúc đợt đăng ký không thể trước thời gian bắt đầu.");
        }
        if (period.getMaxCredits() != null && period.getMaxCredits() < 0) {
            throw new BadRequestException("Số tín chỉ tối đa không được âm.");
        }
        if (period.getPeriodId() != null && periodRepository.existsById(period.getPeriodId())) {
            throw new DuplicateResourceException("Mã đợt đăng ký đã tồn tại: " + period.getPeriodId());
        }
        return periodRepository.save(period);
    }

    public RegistrationPeriod updatePeriod(String id, RegistrationPeriod period) {
        if (!periodRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy đợt đăng ký với mã: " + id);
        }
        if (period.getSemester() != null && period.getSemester().getSemesterId() != null) {
            if (!semesterRepository.existsById(period.getSemester().getSemesterId())) {
                throw new ResourceNotFoundException("Không tìm thấy học kỳ với mã: " + period.getSemester().getSemesterId());
            }
        }
        if (period.getStartTime() != null && period.getEndTime() != null
                && period.getEndTime().isBefore(period.getStartTime())) {
            throw new BadRequestException("Thời gian kết thúc đợt đăng ký không thể trước thời gian bắt đầu.");
        }
        if (period.getMaxCredits() != null && period.getMaxCredits() < 0) {
            throw new BadRequestException("Số tín chỉ tối đa không được âm.");
        }
        period.setPeriodId(id);
        return periodRepository.save(period);
    }

    public void deletePeriod(String id) {
        if (!periodRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy đợt đăng ký với mã: " + id);
        }
        periodRepository.deleteById(id);
    }
}
