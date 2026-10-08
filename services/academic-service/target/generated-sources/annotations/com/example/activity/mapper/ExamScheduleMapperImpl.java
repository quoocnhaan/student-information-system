package com.example.activity.mapper;

import com.example.activity.dto.request.ExamScheduleRequest;
import com.example.activity.dto.response.ExamScheduleResponse;
import com.example.activity.entity.Classes;
import com.example.activity.entity.ExamSchedule;
import com.example.activity.entity.Semester;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-10-07T22:16:19+0700",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.10 (Oracle Corporation)"
)
@Component
public class ExamScheduleMapperImpl implements ExamScheduleMapper {

    @Override
    public ExamScheduleResponse toResponse(ExamSchedule entity) {
        if ( entity == null ) {
            return null;
        }

        ExamScheduleResponse examScheduleResponse = new ExamScheduleResponse();

        examScheduleResponse.setSemesterId( entitySemesterSemesterId( entity ) );
        examScheduleResponse.setIdClasses( entityClassesIdClasses( entity ) );
        examScheduleResponse.setExamId( entity.getExamId() );
        examScheduleResponse.setRoom( entity.getRoom() );
        examScheduleResponse.setStartTime( entity.getStartTime() );
        examScheduleResponse.setEndTime( entity.getEndTime() );
        examScheduleResponse.setCapacity( entity.getCapacity() );
        examScheduleResponse.setType( entity.getType() );

        return examScheduleResponse;
    }

    @Override
    public ExamSchedule toEntity(ExamScheduleRequest request) {
        if ( request == null ) {
            return null;
        }

        ExamSchedule examSchedule = new ExamSchedule();

        examSchedule.setExamId( request.getExamId() );
        examSchedule.setRoom( request.getRoom() );
        examSchedule.setStartTime( request.getStartTime() );
        examSchedule.setEndTime( request.getEndTime() );
        examSchedule.setCapacity( request.getCapacity() );
        examSchedule.setType( request.getType() );

        return examSchedule;
    }

    @Override
    public void updateEntity(ExamScheduleRequest request, ExamSchedule entity) {
        if ( request == null ) {
            return;
        }

        entity.setRoom( request.getRoom() );
        entity.setStartTime( request.getStartTime() );
        entity.setEndTime( request.getEndTime() );
        entity.setCapacity( request.getCapacity() );
        entity.setType( request.getType() );
    }

    private String entitySemesterSemesterId(ExamSchedule examSchedule) {
        if ( examSchedule == null ) {
            return null;
        }
        Semester semester = examSchedule.getSemester();
        if ( semester == null ) {
            return null;
        }
        String semesterId = semester.getSemesterId();
        if ( semesterId == null ) {
            return null;
        }
        return semesterId;
    }

    private String entityClassesIdClasses(ExamSchedule examSchedule) {
        if ( examSchedule == null ) {
            return null;
        }
        Classes classes = examSchedule.getClasses();
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
