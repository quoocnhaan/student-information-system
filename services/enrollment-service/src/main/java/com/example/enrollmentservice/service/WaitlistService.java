package com.example.enrollmentservice.service;

import com.example.enrollmentservice.entity.Waitlist;
import com.example.enrollmentservice.exception.BadRequestException;
import com.example.enrollmentservice.exception.DuplicateResourceException;
import com.example.enrollmentservice.exception.ResourceNotFoundException;
import com.example.enrollmentservice.repository.WaitlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WaitlistService {
    private final WaitlistRepository waitlistRepository;

    public List<Waitlist> getAllWaitlists() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            boolean isStudent = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_STUDENT"));
            boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (isStudent && !isAdmin) {
                return waitlistRepository.findByStudentId(auth.getName());
            }
        }
        return waitlistRepository.findAll();
    }

    public Waitlist getWaitlistById(String id) {
        Waitlist waitlist = waitlistRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh sách chờ với mã: " + id));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            boolean isStudent = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_STUDENT"));
            boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (isStudent && !isAdmin && !waitlist.getStudentId().equals(auth.getName())) {
                throw new AccessDeniedException("Bạn không được phép xem thông tin danh sách chờ của sinh viên khác.");
            }
        }
        return waitlist;
    }

    public Waitlist createWaitlist(Waitlist waitlist) {
        if (waitlist.getPosition() != null && waitlist.getPosition() < 0) {
            throw new BadRequestException("Vị trí trong danh sách chờ không thể âm.");
        }
        if (waitlist.getWaitlistId() != null && waitlistRepository.existsById(waitlist.getWaitlistId())) {
            throw new DuplicateResourceException("Mã danh sách chờ đã tồn tại: " + waitlist.getWaitlistId());
        }
        return waitlistRepository.save(waitlist);
    }

    public Waitlist updateWaitlist(String id, Waitlist waitlist) {
        if (!waitlistRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy danh sách chờ với mã: " + id);
        }
        if (waitlist.getPosition() != null && waitlist.getPosition() < 0) {
            throw new BadRequestException("Vị trí trong danh sách chờ không thể âm.");
        }
        waitlist.setWaitlistId(id);
        return waitlistRepository.save(waitlist);
    }

    public void deleteWaitlist(String id) {
        if (!waitlistRepository.existsById(id)) {
            throw new ResourceNotFoundException("Không tìm thấy danh sách chờ với mã: " + id);
        }
        waitlistRepository.deleteById(id);
    }
}
