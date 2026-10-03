package com.example.activity.mapper;

import com.example.activity.dto.request.SemesterRequest;
import com.example.activity.dto.response.SemesterResponse;
import com.example.activity.entity.Semester;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-10-03T21:23:19+0700",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.10 (Oracle Corporation)"
)
@Component
public class SemesterMapperImpl implements SemesterMapper {

    @Override
    public SemesterResponse toResponse(Semester entity) {
        if ( entity == null ) {
            return null;
        }

        SemesterResponse semesterResponse = new SemesterResponse();

        semesterResponse.setSemesterId( entity.getSemesterId() );
        semesterResponse.setName( entity.getName() );
        semesterResponse.setStartDate( entity.getStartDate() );
        semesterResponse.setEndDate( entity.getEndDate() );
        semesterResponse.setStatus( entity.getStatus() );

        return semesterResponse;
    }

    @Override
    public Semester toEntity(SemesterRequest request) {
        if ( request == null ) {
            return null;
        }

        Semester semester = new Semester();

        semester.setSemesterId( request.getSemesterId() );
        semester.setName( request.getName() );
        semester.setStartDate( request.getStartDate() );
        semester.setEndDate( request.getEndDate() );
        semester.setStatus( request.getStatus() );

        return semester;
    }

    @Override
    public void updateEntity(SemesterRequest request, Semester entity) {
        if ( request == null ) {
            return;
        }

        entity.setName( request.getName() );
        entity.setStartDate( request.getStartDate() );
        entity.setEndDate( request.getEndDate() );
        entity.setStatus( request.getStatus() );
    }
}
