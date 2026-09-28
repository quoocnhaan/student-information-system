package com.example.activity.mapper;

import com.example.activity.dto.request.StudentScoreRequest;
import com.example.activity.dto.response.StudentScoreResponse;
import com.example.activity.entity.GradeComponent;
import com.example.activity.entity.StudentEnrollment;
import com.example.activity.entity.StudentScore;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-09-28T21:52:14+0700",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.10 (Oracle Corporation)"
)
@Component
public class StudentScoreMapperImpl implements StudentScoreMapper {

    @Override
    public StudentScoreResponse toResponse(StudentScore entity) {
        if ( entity == null ) {
            return null;
        }

        StudentScoreResponse studentScoreResponse = new StudentScoreResponse();

        studentScoreResponse.setIdGradeComponents( entityGradeComponentIdGradeComponents( entity ) );
        studentScoreResponse.setEnrollmentId( entityEnrollmentEnrollmentId( entity ) );
        studentScoreResponse.setIdScore( entity.getIdScore() );
        studentScoreResponse.setScore( entity.getScore() );

        return studentScoreResponse;
    }

    @Override
    public StudentScore toEntity(StudentScoreRequest request) {
        if ( request == null ) {
            return null;
        }

        StudentScore studentScore = new StudentScore();

        studentScore.setIdScore( request.getIdScore() );
        studentScore.setScore( request.getScore() );

        return studentScore;
    }

    @Override
    public void updateEntity(StudentScoreRequest request, StudentScore entity) {
        if ( request == null ) {
            return;
        }

        entity.setScore( request.getScore() );
    }

    private String entityGradeComponentIdGradeComponents(StudentScore studentScore) {
        if ( studentScore == null ) {
            return null;
        }
        GradeComponent gradeComponent = studentScore.getGradeComponent();
        if ( gradeComponent == null ) {
            return null;
        }
        String idGradeComponents = gradeComponent.getIdGradeComponents();
        if ( idGradeComponents == null ) {
            return null;
        }
        return idGradeComponents;
    }

    private String entityEnrollmentEnrollmentId(StudentScore studentScore) {
        if ( studentScore == null ) {
            return null;
        }
        StudentEnrollment enrollment = studentScore.getEnrollment();
        if ( enrollment == null ) {
            return null;
        }
        String enrollmentId = enrollment.getEnrollmentId();
        if ( enrollmentId == null ) {
            return null;
        }
        return enrollmentId;
    }
}
