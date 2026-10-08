package com.example.activity.mapper;

import com.example.activity.dto.request.StudentEnrollmentRequest;
import com.example.activity.dto.response.StudentEnrollmentResponse;
import com.example.activity.entity.Classes;
import com.example.activity.entity.StudentEnrollment;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-10-07T22:16:19+0700",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.10 (Oracle Corporation)"
)
@Component
public class StudentEnrollmentMapperImpl implements StudentEnrollmentMapper {

    @Override
    public StudentEnrollmentResponse toResponse(StudentEnrollment entity) {
        if ( entity == null ) {
            return null;
        }

        StudentEnrollmentResponse studentEnrollmentResponse = new StudentEnrollmentResponse();

        studentEnrollmentResponse.setIdClasses( entityClassesIdClasses( entity ) );
        studentEnrollmentResponse.setEnrollmentId( entity.getEnrollmentId() );
        studentEnrollmentResponse.setStudentId( entity.getStudentId() );
        studentEnrollmentResponse.setEnrollmentStatus( entity.getEnrollmentStatus() );
        studentEnrollmentResponse.setFinalScore( entity.getFinalScore() );
        studentEnrollmentResponse.setLetterGrade( entity.getLetterGrade() );
        studentEnrollmentResponse.setIsPassed( entity.getIsPassed() );

        return studentEnrollmentResponse;
    }

    @Override
    public StudentEnrollment toEntity(StudentEnrollmentRequest request) {
        if ( request == null ) {
            return null;
        }

        StudentEnrollment studentEnrollment = new StudentEnrollment();

        studentEnrollment.setEnrollmentId( request.getEnrollmentId() );
        studentEnrollment.setStudentId( request.getStudentId() );
        studentEnrollment.setEnrollmentStatus( request.getEnrollmentStatus() );
        studentEnrollment.setFinalScore( request.getFinalScore() );
        studentEnrollment.setLetterGrade( request.getLetterGrade() );
        studentEnrollment.setIsPassed( request.getIsPassed() );

        return studentEnrollment;
    }

    @Override
    public void updateEntity(StudentEnrollmentRequest request, StudentEnrollment entity) {
        if ( request == null ) {
            return;
        }

        entity.setStudentId( request.getStudentId() );
        entity.setEnrollmentStatus( request.getEnrollmentStatus() );
        entity.setFinalScore( request.getFinalScore() );
        entity.setLetterGrade( request.getLetterGrade() );
        entity.setIsPassed( request.getIsPassed() );
    }

    private String entityClassesIdClasses(StudentEnrollment studentEnrollment) {
        if ( studentEnrollment == null ) {
            return null;
        }
        Classes classes = studentEnrollment.getClasses();
        if ( classes == null ) {
            return null;
        }
        String idClasses = classes.getIdClasses();
        if ( idClasses == null ) {
            return null;
        }
        return idClasses;
    }
}
