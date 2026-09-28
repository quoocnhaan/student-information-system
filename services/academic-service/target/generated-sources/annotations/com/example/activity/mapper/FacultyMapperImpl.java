package com.example.activity.mapper;

import com.example.activity.dto.request.FacultyRequest;
import com.example.activity.dto.response.FacultyResponse;
import com.example.activity.entity.Faculty;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-09-28T21:52:14+0700",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.10 (Oracle Corporation)"
)
@Component
public class FacultyMapperImpl implements FacultyMapper {

    @Override
    public FacultyResponse toResponse(Faculty entity) {
        if ( entity == null ) {
            return null;
        }

        FacultyResponse facultyResponse = new FacultyResponse();

        facultyResponse.setFacultyId( entity.getFacultyId() );
        facultyResponse.setName( entity.getName() );

        return facultyResponse;
    }

    @Override
    public Faculty toEntity(FacultyRequest request) {
        if ( request == null ) {
            return null;
        }

        Faculty faculty = new Faculty();

        faculty.setFacultyId( request.getFacultyId() );
        faculty.setName( request.getName() );

        return faculty;
    }

    @Override
    public void updateEntity(FacultyRequest request, Faculty entity) {
        if ( request == null ) {
            return;
        }

        entity.setName( request.getName() );
    }
}
