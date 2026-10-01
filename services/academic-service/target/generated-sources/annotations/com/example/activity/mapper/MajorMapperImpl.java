package com.example.activity.mapper;

import com.example.activity.dto.request.MajorRequest;
import com.example.activity.dto.response.MajorResponse;
import com.example.activity.entity.Faculty;
import com.example.activity.entity.Major;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-10-01T09:14:27+0700",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.10 (Oracle Corporation)"
)
@Component
public class MajorMapperImpl implements MajorMapper {

    @Override
    public MajorResponse toResponse(Major entity) {
        if ( entity == null ) {
            return null;
        }

        MajorResponse majorResponse = new MajorResponse();

        majorResponse.setFacultyId( entityFacultyFacultyId( entity ) );
        majorResponse.setMajorId( entity.getMajorId() );
        majorResponse.setName( entity.getName() );

        return majorResponse;
    }

    @Override
    public Major toEntity(MajorRequest request) {
        if ( request == null ) {
            return null;
        }

        Major major = new Major();

        major.setMajorId( request.getMajorId() );
        major.setName( request.getName() );

        return major;
    }

    @Override
    public void updateEntity(MajorRequest request, Major entity) {
        if ( request == null ) {
            return;
        }

        entity.setName( request.getName() );
    }

    private String entityFacultyFacultyId(Major major) {
        if ( major == null ) {
            return null;
        }
        Faculty faculty = major.getFaculty();
        if ( faculty == null ) {
            return null;
        }
        String facultyId = faculty.getFacultyId();
        if ( facultyId == null ) {
            return null;
        }
        return facultyId;
    }
}
