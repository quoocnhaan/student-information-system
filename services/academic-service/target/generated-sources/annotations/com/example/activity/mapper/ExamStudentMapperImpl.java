package com.example.activity.mapper;

import com.example.activity.dto.request.ExamStudentRequest;
import com.example.activity.dto.response.ExamStudentResponse;
import com.example.activity.entity.ExamSchedule;
import com.example.activity.entity.ExamStudent;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-10-07T22:16:19+0700",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.10 (Oracle Corporation)"
)
@Component
public class ExamStudentMapperImpl implements ExamStudentMapper {

    @Override
    public ExamStudentResponse toResponse(ExamStudent entity) {
        if ( entity == null ) {
            return null;
        }

        ExamStudentResponse examStudentResponse = new ExamStudentResponse();

        examStudentResponse.setExamId( entityExamScheduleExamId( entity ) );
        examStudentResponse.setIdExamStudent( entity.getIdExamStudent() );
        examStudentResponse.setStudentId( entity.getStudentId() );
        examStudentResponse.setStatus( entity.getStatus() );

        return examStudentResponse;
    }

    @Override
    public ExamStudent toEntity(ExamStudentRequest request) {
        if ( request == null ) {
            return null;
        }

        ExamStudent examStudent = new ExamStudent();

        examStudent.setStudentId( request.getStudentId() );
        examStudent.setStatus( request.getStatus() );

        return examStudent;
    }

    @Override
    public void updateEntity(ExamStudentRequest request, ExamStudent entity) {
        if ( request == null ) {
            return;
        }

        entity.setStudentId( request.getStudentId() );
        entity.setStatus( request.getStatus() );
    }

    private String entityExamScheduleExamId(ExamStudent examStudent) {
        if ( examStudent == null ) {
            return null;
        }
        ExamSchedule examSchedule = examStudent.getExamSchedule();
        if ( examSchedule == null ) {
            return null;
        }
        String examId = examSchedule.getExamId();
        if ( examId == null ) {
            return null;
        }
        return examId;
    }
}
