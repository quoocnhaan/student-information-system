package com.example.activity.mapper;

import com.example.activity.dto.request.ClassesRequest;
import com.example.activity.dto.response.ClassesResponse;
import com.example.activity.entity.Classes;
import com.example.activity.entity.Course;
import com.example.activity.entity.Semester;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-10-01T09:14:27+0700",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.10 (Oracle Corporation)"
)
@Component
public class ClassesMapperImpl implements ClassesMapper {

    @Override
    public ClassesResponse toResponse(Classes entity) {
        if ( entity == null ) {
            return null;
        }

        ClassesResponse classesResponse = new ClassesResponse();

        classesResponse.setCourseId( entityCourseIdCourse( entity ) );
        classesResponse.setSemesterId( entitySemesterSemesterId( entity ) );
        classesResponse.setIdClasses( entity.getIdClasses() );
        classesResponse.setCapacity( entity.getCapacity() );
        classesResponse.setStatus( entity.getStatus() );
        classesResponse.setRoom( entity.getRoom() );
        classesResponse.setLecturerId( entity.getLecturerId() );
        classesResponse.setDay( entity.getDay() );

        return classesResponse;
    }

    @Override
    public Classes toEntity(ClassesRequest request) {
        if ( request == null ) {
            return null;
        }

        Classes classes = new Classes();

        classes.setIdClasses( request.getIdClasses() );
        classes.setCapacity( request.getCapacity() );
        classes.setStatus( request.getStatus() );
        classes.setRoom( request.getRoom() );
        classes.setLecturerId( request.getLecturerId() );
        classes.setDay( request.getDay() );

        return classes;
    }

    @Override
    public void updateEntity(ClassesRequest request, Classes entity) {
        if ( request == null ) {
            return;
        }

        entity.setCapacity( request.getCapacity() );
        entity.setStatus( request.getStatus() );
        entity.setRoom( request.getRoom() );
        entity.setLecturerId( request.getLecturerId() );
        entity.setDay( request.getDay() );
    }

    private String entityCourseIdCourse(Classes classes) {
        if ( classes == null ) {
            return null;
        }
        Course course = classes.getCourse();
        if ( course == null ) {
            return null;
        }
        String idCourse = course.getIdCourse();
        if ( idCourse == null ) {
            return null;
        }
        return idCourse;
    }

    private String entitySemesterSemesterId(Classes classes) {
        if ( classes == null ) {
            return null;
        }
        Semester semester = classes.getSemester();
        if ( semester == null ) {
            return null;
        }
        String semesterId = semester.getSemesterId();
        if ( semesterId == null ) {
            return null;
        }
        return semesterId;
    }
}
