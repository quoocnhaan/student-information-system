package com.example.enrollmentservice.service;

import com.example.enrollmentservice.dto.EnrollmentRequest;
import com.example.enrollmentservice.dto.EnrollmentResponse;
import com.example.enrollmentservice.entity.*;
import com.example.enrollmentservice.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional
    public EnrollmentResponse enroll(EnrollmentRequest request) {
        ClassEntity courseClass = classRepository.findById(request.getClassId())
                .orElseThrow(() -> new RuntimeException("Class not found"));

        RegistrationPeriod period = periodRepository.findById(request.getPeriodId())
                .orElseThrow(() -> new RuntimeException("Registration period not found"));

        // Kiểm tra xem đã đăng ký chưa
        // Cần custom query trong repository, tạm thời fetch all (thực tế nên viết query trong Repository)
        // ... (Giả sử sinh viên chưa đăng ký)

        // Kiểm tra sĩ số
        if (courseClass.getCurrentEnrolled() >= courseClass.getMaxCapacity()) {
            // Đưa vào waitlist
            Waitlist waitlist = Waitlist.builder()
                    .waitlistId("WTL_" + UUID.randomUUID().toString().substring(0, 8))
                    .courseClass(courseClass)
                    .studentId(request.getStudentId())
                    .position(1) // Logic tính position thực tế cần query max position hiện tại
                    .status("WAITING")
                    .build();
            waitlistRepository.save(waitlist);

            return EnrollmentResponse.builder()
                    .studentId(request.getStudentId())
                    .classId(request.getClassId())
                    .status("WAITING")
                    .message("Lớp đã đầy. Đã thêm vào danh sách chờ.")
                    .build();
        }

        // Tăng current enrolled
        courseClass.setCurrentEnrolled(courseClass.getCurrentEnrolled() + 1);
        if (courseClass.getCurrentEnrolled().equals(courseClass.getMaxCapacity())) {
            courseClass.setStatus("FULL");
        }
        classRepository.save(courseClass);

        // Tạo enrollment
        Enrollment enrollment = Enrollment.builder()
                .enrollmentId("ENR_" + UUID.randomUUID().toString().substring(0, 8))
                .period(period)
                .studentId(request.getStudentId())
                .courseClass(courseClass)
                .semester(semesterRepository.findById(courseClass.getSemesterId()).orElse(null))
                .status("ENROLLED")
                .build();
        enrollment = enrollmentRepository.save(enrollment);

        // Lưu lịch sử
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
                .status("ENROLLED")
                .message("Đăng ký học phần thành công")
                .enrolledAt(enrollment.getEnrolledAt())
                .build();
    }

    public java.util.List<Enrollment> getAllEnrollments() {
        return enrollmentRepository.findAll();
    }

    public Enrollment getEnrollmentById(String id) {
        return enrollmentRepository.findById(id).orElse(null);
    }

    @Transactional
    public void deleteEnrollment(String id) {
        enrollmentRepository.deleteById(id);
    }
}
