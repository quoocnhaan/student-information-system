package com.example.enrollmentservice.service;

import com.example.enrollmentservice.entity.EnrollmentHistory;
import com.example.enrollmentservice.exception.DuplicateResourceException;
import com.example.enrollmentservice.exception.ResourceNotFoundException;
import com.example.enrollmentservice.repository.EnrollmentHistoryRepository;
import com.example.enrollmentservice.repository.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EnrollmentHistoryService {
    private final EnrollmentHistoryRepository historyRepository;
    private final EnrollmentRepository enrollmentRepository;

    public List<EnrollmentHistory> getAllHistories() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            boolean isStudent = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_STUDENT"));
            boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (isStudent && !isAdmin) {
                return historyRepository.findByEnrollment_StudentId(auth.getName());
            }
        }
        return historyRepository.findAll();
    }

    public EnrollmentHistory getHistoryById(String id) {
        EnrollmentHistory history = historyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lịch sử đăng ký mã: " + id));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            boolean isStudent = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_STUDENT"));
            boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (isStudent && !isAdmin && (history.getEnrollment() == null || !history.getEnrollment().getStudentId().equals(auth.getName()))) {
                throw new AccessDeniedException("Bạn không được phép xem lịch sử đăng ký của sinh viên khác.");
            }
        }
        return history;
    }

    public EnrollmentHistory createHistory(EnrollmentHistory history) {
        if (history.getHistoryId() == null || history.getHistoryId().trim().isEmpty()) {
            throw new BadRequestException("Mã lịch sử đăng ký không được để trống.");
        }
        if (historyRepository.existsById(history.getHistoryId())) {
            throw new DuplicateResourceException("Mã lịch sử đã tồn tại: " + history.getHistoryId());
        }
        if (history.getEnrollment() != null && history.getEnrollment().getEnrollmentId() != null) {
            if (!enrollmentRepository.existsById(history.getEnrollment().getEnrollmentId())) {
                throw new ResourceNotFoundException("Không tìm thấy đăng ký với mã: " + history.getEnrollment().getEnrollmentId());
            }
        }
        return historyRepository.save(history);
    }

    public EnrollmentHistory updateHistory(String id, EnrollmentHistory history) {
        if (!historyRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy lịch sử đăng ký mã: " + id);
        }
        if (history.getEnrollment() != null && history.getEnrollment().getEnrollmentId() != null) {
            if (!enrollmentRepository.existsById(history.getEnrollment().getEnrollmentId())) {
                throw new ResourceNotFoundException("Không tìm thấy đăng ký với mã: " + history.getEnrollment().getEnrollmentId());
            }
        }
        history.setHistoryId(id);
        return historyRepository.save(history);
    }

    public void deleteHistory(String id) {
        if (!historyRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy lịch sử đăng ký mã: " + id);
        }
        historyRepository.deleteById(id);
    }
}
