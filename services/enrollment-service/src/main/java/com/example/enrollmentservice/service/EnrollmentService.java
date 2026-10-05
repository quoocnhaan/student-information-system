package com.example.enrollmentservice.service;

import com.example.enrollmentservice.dto.EnrollmentRequest;
import com.example.enrollmentservice.dto.EnrollmentResponse;
import com.example.enrollmentservice.entity.*;
import com.example.enrollmentservice.exception.BadRequestException;
import com.example.enrollmentservice.exception.DuplicateResourceException;
import com.example.enrollmentservice.exception.ResourceNotFoundException;
import com.example.enrollmentservice.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final ClassRepository classRepository;
    private final SemesterRepository semesterRepository;
    private final RegistrationPeriodRepository periodRepository;
    private final EnrollmentHistoryRepository historyRepository;
    private final WaitlistRepository waitlistRepository;
    private final CourseRepository courseRepository;

    @Transactional
    public EnrollmentResponse enroll(EnrollmentRequest request) {
        if (request == null || request.getClassId() == null || request.getPeriodId() == null) {
            throw new BadRequestException("Thông tin đăng ký không hợp lệ (classId và periodId là bắt buộc).");
        }

        // Validate Security Context: If user is ROLE_STUDENT, enforce studentId matching token
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            boolean isStudent = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_STUDENT"));
            boolean isAdmin = auth.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

            if (isStudent && !isAdmin) {
                String tokenUsername = auth.getName();
                if (request.getStudentId() == null || request.getStudentId().isEmpty()) {
                    request.setStudentId(tokenUsername);
                } else if (!request.getStudentId().equals(tokenUsername)) {
                    throw new AccessDeniedException("Sinh viên không được phép đăng ký thay cho sinh viên khác.");
                }
            }
        }

        if (request.getStudentId() == null || request.getStudentId().isEmpty()) {
            throw new BadRequestException("Mã sinh viên (studentId) không được để trống.");
        }

        ClassEntity courseClass = classRepository.findById(request.getClassId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy lớp học với mã: " + request.getClassId()));

        RegistrationPeriod period = periodRepository.findById(request.getPeriodId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đợt đăng ký với mã: " + request.getPeriodId()));

        // N-04 Check: Semester matching
        if (period.getSemester() != null && courseClass.getSemesterId() != null
                && !period.getSemester().getSemesterId().equals(courseClass.getSemesterId())) {
            throw new BadRequestException("Lớp học phần không thuộc học kỳ của đợt đăng ký này.");
        }

        // Check if class status is CLOSED
        if ("CLOSED".equalsIgnoreCase(courseClass.getStatus())) {
            throw new BadRequestException("Lớp học hiện tại đã đóng.");
        }

        // Check registration period status and dates
        LocalDateTime now = LocalDateTime.now();
        if ("CLOSED".equalsIgnoreCase(period.getStatus())
                || (period.getStartTime() != null && now.isBefore(period.getStartTime()))
                || (period.getEndTime() != null && now.isAfter(period.getEndTime()))) {
            throw new BadRequestException("Đợt đăng ký học phần hiện tại đã đóng hoặc không trong thời gian cho phép.");
        }

        // Check duplicate enrollment
        if (enrollmentRepository.existsByStudentIdAndCourseClass_ClassIdAndStatus(request.getStudentId(), request.getClassId(), "ENROLLED")) {
            throw new DuplicateResourceException("Sinh viên đã đăng ký lớp học này rồi.");
        }

        // Fetch Course info for response and credit calculation
        Course course = null;
        String courseCode = null;
        String courseName = null;
        if (courseClass.getCourseId() != null) {
            course = courseRepository.findById(courseClass.getCourseId()).orElse(null);
            if (course != null) {
                courseCode = course.getCourseCode();
                courseName = course.getName();
            }
        }

        // N-04 Check: Max credit limit check
        if (period.getMaxCredits() != null) {
            int newCourseCredits = (course != null && course.getCredits() != null) ? course.getCredits() : 0;
            List<Enrollment> existingEnrollments = enrollmentRepository.findByStudentId(request.getStudentId());

            int currentTotalCredits = existingEnrollments.stream()
                    .filter(e -> "ENROLLED".equalsIgnoreCase(e.getStatus()))
                    .filter(e -> e.getSemester() != null && e.getSemester().getSemesterId().equals(courseClass.getSemesterId()))
                    .mapToInt(e -> {
                        if (e.getCourseClass() != null && e.getCourseClass().getCourseId() != null) {
                            Course c = courseRepository.findById(e.getCourseClass().getCourseId()).orElse(null);
                            return c != null && c.getCredits() != null ? c.getCredits() : 0;
                        }
                        return 0;
                    }).sum();

            if (currentTotalCredits + newCourseCredits > period.getMaxCredits()) {
                throw new BadRequestException("Đăng ký không thành công. Tổng số tín chỉ ("
                        + (currentTotalCredits + newCourseCredits)
                        + ") vượt quá giới hạn tối đa cho phép (" + period.getMaxCredits() + " tín chỉ).");
            }
        }

        int currentEnrolled = courseClass.getCurrentEnrolled() != null ? courseClass.getCurrentEnrolled() : 0;
        int maxCapacity = courseClass.getMaxCapacity() != null ? courseClass.getMaxCapacity() : 0;

        // Check capacity
        if (currentEnrolled >= maxCapacity) {
            // Check if already in waitlist
            if (waitlistRepository.existsByStudentIdAndCourseClass_ClassId(request.getStudentId(), request.getClassId())) {
                throw new DuplicateResourceException("Sinh viên đã có trong danh sách chờ của lớp này.");
            }

            int nextPosition = waitlistRepository.findMaxPositionByClassId(request.getClassId()) + 1;
            Waitlist waitlist = Waitlist.builder()
                    .waitlistId("WTL_" + UUID.randomUUID().toString().substring(0, 8))
                    .courseClass(courseClass)
                    .studentId(request.getStudentId())
                    .position(nextPosition)
                    .status("WAITING")
                    .build();
            waitlistRepository.save(waitlist);

            return EnrollmentResponse.builder()
                    .studentId(request.getStudentId())
                    .classId(request.getClassId())
                    .courseCode(courseCode)
                    .courseName(courseName)
                    .status("WAITING")
                    .message("Lớp đã đầy. Đã thêm vào danh sách chờ ở vị trí " + nextPosition + ".")
                    .build();
        }

        // Increment current enrolled
        courseClass.setCurrentEnrolled(currentEnrolled + 1);
        if (courseClass.getCurrentEnrolled() >= maxCapacity) {
            courseClass.setStatus("FULL");
        }
        classRepository.save(courseClass);

        // Create enrollment
        Enrollment enrollment = Enrollment.builder()
                .enrollmentId("ENR_" + UUID.randomUUID().toString().substring(0, 8))
                .period(period)
                .studentId(request.getStudentId())
                .courseClass(courseClass)
                .semester(semesterRepository.findById(courseClass.getSemesterId()).orElse(null))
                .status("ENROLLED")
                .build();
        enrollment = enrollmentRepository.save(enrollment);

        // Record history
        EnrollmentHistory history = EnrollmentHistory.builder()
                .historyId("HIS_" + UUID.randomUUID().toString().substring(0, 8))
                .enrollment(enrollment)
                .action("REGISTER")
                .newStatus("ENROLLED")
                .reason("Sinh viên đăng ký thành công")
                .build();
        historyRepository.save(history);

        return EnrollmentResponse.builder()
                .enrollmentId(enrollment.getEnrollmentId())
                .studentId(enrollment.getStudentId())
                .classId(enrollment.getCourseClass().getClassId())
                .courseCode(courseCode)
                .courseName(courseName)
                .status("ENROLLED")
                .message("Đăng ký học phần thành công")
                .enrolledAt(enrollment.getEnrolledAt())
                .build();
    }

    public List<Enrollment> getAllEnrollments() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            boolean isStudent = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_STUDENT"));
            boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (isStudent && !isAdmin) {
                return enrollmentRepository.findByStudentId(auth.getName());
            }
        }
        return enrollmentRepository.findAll();
    }

    public Enrollment getEnrollmentById(String id) {
        Enrollment enrollment = enrollmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đăng ký học phần mã: " + id));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            boolean isStudent = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_STUDENT"));
            boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (isStudent && !isAdmin && !enrollment.getStudentId().equals(auth.getName())) {
                throw new AccessDeniedException("Bạn không có quyền xem thông tin đăng ký của sinh viên khác.");
            }
        }
        return enrollment;
    }

    @Transactional
    public void deleteEnrollment(String id) {
        Enrollment enrollment = enrollmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đăng ký học phần mã: " + id));

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null) {
            boolean isStudent = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_STUDENT"));
            boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            if (isStudent && !isAdmin && !enrollment.getStudentId().equals(auth.getName())) {
                throw new AccessDeniedException("Bạn không được phép hủy đăng ký của sinh viên khác.");
            }
        }

        // Decrement class capacity if enrolled
        ClassEntity courseClass = enrollment.getCourseClass();
        if (courseClass != null && "ENROLLED".equalsIgnoreCase(enrollment.getStatus())) {
            int currentEnrolled = courseClass.getCurrentEnrolled() != null ? courseClass.getCurrentEnrolled() : 0;
            if (currentEnrolled > 0) {
                courseClass.setCurrentEnrolled(currentEnrolled - 1);
            }
            if ("FULL".equalsIgnoreCase(courseClass.getStatus())) {
                courseClass.setStatus("OPEN");
            }
            classRepository.save(courseClass);
        }

        // Clean up history before deleting enrollment
        historyRepository.deleteByEnrollment_EnrollmentId(id);

        enrollmentRepository.deleteById(id);
    }
}
