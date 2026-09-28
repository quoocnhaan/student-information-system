package com.example.activity.mapper;

import com.example.activity.dto.request.CourseRequest;
import com.example.activity.dto.response.CourseResponse;
import com.example.activity.entity.Course;
import com.example.activity.entity.Major;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-09-28T21:52:14+0700",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.10 (Oracle Corporation)"
)
@Component
public class CourseMapperImpl implements CourseMapper {

    @Override
    public CourseResponse toResponse(Course entity) {
        if ( entity == null ) {
            return null;
        }

        CourseResponse courseResponse = new CourseResponse();

        courseResponse.setMajorId( entityMajorMajorId( entity ) );
        courseResponse.setIdCourse( entity.getIdCourse() );
        courseResponse.setName( entity.getName() );
        courseResponse.setCredits( entity.getCredits() );

        return courseResponse;
    }

    @Override
    public Course toEntity(CourseRequest request) {
        if ( request == null ) {
            return null;
        }

        Course course = new Course();

        course.setIdCourse( request.getIdCourse() );
        course.setName( request.getName() );
        course.setCredits( request.getCredits() );

        return course;
    }

    @Override
    public void updateEntity(CourseRequest request, Course entity) {
        if ( request == null ) {
            return;
        }

        entity.setName( request.getName() );
        entity.setCredits( request.getCredits() );
    }

    private String entityMajorMajorId(Course course) {
        if ( course == null ) {
            return null;
        }
        Major major = course.getMajor();
        if ( major == null ) {
            return null;
        }
        String majorId = major.getMajorId();
        if ( majorId == null ) {
            return null;
        }
        return majorId;
    }
}
