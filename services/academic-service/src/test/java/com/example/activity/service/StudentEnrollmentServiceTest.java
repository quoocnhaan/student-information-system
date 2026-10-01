package com.example.activity.service;

import com.example.activity.dto.request.StudentEnrollmentRequest;
import com.example.activity.dto.response.StudentEnrollmentResponse;
import com.example.activity.entity.Classes;
import com.example.activity.entity.StudentEnrollment;
import com.example.activity.mapper.StudentEnrollmentMapper;
import com.example.activity.repository.ClassesRepository;
import com.example.activity.repository.StudentEnrollmentRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StudentEnrollmentServiceTest {

    @Mock
    private StudentEnrollmentRepository studentEnrollmentRepository;

    @Mock
    private ClassesRepository classesRepository;

    @Mock
    private StudentEnrollmentMapper studentEnrollmentMapper;

    @InjectMocks
    private StudentEnrollmentService studentEnrollmentService;

    private Classes classes;

    @BeforeEach
    void setUp() {
        classes = new Classes();
        classes.setIdClasses("TCL2201511");
        classes.setCapacity(50);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void setSecurityContext(String username, String role) {
        Authentication auth = new UsernamePasswordAuthenticationToken(
                username, null, List.of(new SimpleGrantedAuthority(role))
        );
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("A-152: Student cannot self-assign finalScore, letterGrade, isPassed, enrollmentStatus on enrollment")
    void testCreate_StudentCannotSelfAssignGrade() {
        setSecurityContext("student_01", "ROLE_STUDENT");

        StudentEnrollmentRequest request = new StudentEnrollmentRequest();
        request.setEnrollmentId("TEN6201511");
        request.setStudentId("student_01");
        request.setIdClasses("TCL2201511");
        request.setFinalScore(BigDecimal.valueOf(10.0));
        request.setLetterGrade("A");
        request.setIsPassed(true);
        request.setEnrollmentStatus("COMPLETED");

        when(studentEnrollmentRepository.existsById("TEN6201511")).thenReturn(false);
        when(studentEnrollmentRepository.existsByClasses_IdClassesAndStudentId("TCL2201511", "student_01")).thenReturn(false);
        when(classesRepository.findById("TCL2201511")).thenReturn(Optional.of(classes));
        when(studentEnrollmentRepository.countByClasses_IdClasses("TCL2201511")).thenReturn(10L);

        StudentEnrollment mappedEntity = new StudentEnrollment();
        mappedEntity.setEnrollmentId("TEN6201511");
        mappedEntity.setStudentId("student_01");
        mappedEntity.setFinalScore(BigDecimal.valueOf(10.0));
        mappedEntity.setLetterGrade("A");
        mappedEntity.setIsPassed(true);
        mappedEntity.setEnrollmentStatus("COMPLETED");

        when(studentEnrollmentMapper.toEntity(request)).thenReturn(mappedEntity);
        when(studentEnrollmentRepository.save(any(StudentEnrollment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(studentEnrollmentMapper.toResponse(any(StudentEnrollment.class))).thenAnswer(invocation -> {
            StudentEnrollment se = invocation.getArgument(0);
            StudentEnrollmentResponse res = new StudentEnrollmentResponse();
            res.setEnrollmentId(se.getEnrollmentId());
            res.setStudentId(se.getStudentId());
            res.setFinalScore(se.getFinalScore());
            res.setLetterGrade(se.getLetterGrade());
            res.setIsPassed(se.getIsPassed());
            res.setEnrollmentStatus(se.getEnrollmentStatus());
            return res;
        });

        StudentEnrollmentResponse response = studentEnrollmentService.create(request);

        assertNotNull(response);
        assertNull(response.getFinalScore(), "finalScore must be null for student");
        assertNull(response.getLetterGrade(), "letterGrade must be null for student");
        assertNull(response.getIsPassed(), "isPassed must be null for student");
        assertNull(response.getEnrollmentStatus(), "enrollmentStatus must be null for student");

        verify(studentEnrollmentRepository).save(argThat(entity ->
                entity.getFinalScore() == null &&
                entity.getLetterGrade() == null &&
                entity.getIsPassed() == null &&
                entity.getEnrollmentStatus() == null
        ));
    }

    @Test
    @DisplayName("Admin can set finalScore, letterGrade, isPassed, enrollmentStatus on enrollment")
    void testCreate_AdminCanSetGrade() {
        setSecurityContext("admin", "ROLE_ADMIN");

        StudentEnrollmentRequest request = new StudentEnrollmentRequest();
        request.setEnrollmentId("TEN6201511");
        request.setStudentId("student_01");
        request.setIdClasses("TCL2201511");
        request.setFinalScore(BigDecimal.valueOf(8.5));
        request.setLetterGrade("B+");
        request.setIsPassed(true);
        request.setEnrollmentStatus("ENROLLED");

        when(studentEnrollmentRepository.existsById("TEN6201511")).thenReturn(false);
        when(studentEnrollmentRepository.existsByClasses_IdClassesAndStudentId("TCL2201511", "student_01")).thenReturn(false);
        when(classesRepository.findById("TCL2201511")).thenReturn(Optional.of(classes));
        when(studentEnrollmentRepository.countByClasses_IdClasses("TCL2201511")).thenReturn(5L);

        StudentEnrollment mappedEntity = new StudentEnrollment();
        mappedEntity.setEnrollmentId("TEN6201511");
        mappedEntity.setStudentId("student_01");
        mappedEntity.setFinalScore(BigDecimal.valueOf(8.5));
        mappedEntity.setLetterGrade("B+");
        mappedEntity.setIsPassed(true);
        mappedEntity.setEnrollmentStatus("ENROLLED");

        when(studentEnrollmentMapper.toEntity(request)).thenReturn(mappedEntity);
        when(studentEnrollmentRepository.save(any(StudentEnrollment.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(studentEnrollmentMapper.toResponse(any(StudentEnrollment.class))).thenAnswer(invocation -> {
            StudentEnrollment se = invocation.getArgument(0);
            StudentEnrollmentResponse res = new StudentEnrollmentResponse();
            res.setEnrollmentId(se.getEnrollmentId());
            res.setStudentId(se.getStudentId());
            res.setFinalScore(se.getFinalScore());
            res.setLetterGrade(se.getLetterGrade());
            res.setIsPassed(se.getIsPassed());
            res.setEnrollmentStatus(se.getEnrollmentStatus());
            return res;
        });

        StudentEnrollmentResponse response = studentEnrollmentService.create(request);

        assertNotNull(response);
        assertEquals(BigDecimal.valueOf(8.5), response.getFinalScore());
        assertEquals("B+", response.getLetterGrade());
        assertTrue(response.getIsPassed());
        assertEquals("ENROLLED", response.getEnrollmentStatus());
    }

    @Test
    @DisplayName("Student cannot call update on enrollments")
    void testUpdate_StudentCannotUpdate() {
        setSecurityContext("student_01", "ROLE_STUDENT");

        StudentEnrollmentRequest request = new StudentEnrollmentRequest();
        request.setEnrollmentId("TEN6201511");

        assertThrows(AccessDeniedException.class, () -> {
            studentEnrollmentService.update("TEN6201511", request);
        });
    }
}
