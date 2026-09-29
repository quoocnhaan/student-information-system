package com.example.activity.mapper;

import com.example.activity.dto.request.GradeComponentRequest;
import com.example.activity.dto.response.GradeComponentResponse;
import com.example.activity.entity.GradeComponent;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-09-29T16:33:23+0700",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.10 (Oracle Corporation)"
)
@Component
public class GradeComponentMapperImpl implements GradeComponentMapper {

    @Override
    public GradeComponentResponse toResponse(GradeComponent entity) {
        if ( entity == null ) {
            return null;
        }

        GradeComponentResponse gradeComponentResponse = new GradeComponentResponse();

        gradeComponentResponse.setIdGradeComponents( entity.getIdGradeComponents() );
        gradeComponentResponse.setName( entity.getName() );
        gradeComponentResponse.setWeightPercentage( entity.getWeightPercentage() );

        return gradeComponentResponse;
    }

    @Override
    public GradeComponent toEntity(GradeComponentRequest request) {
        if ( request == null ) {
            return null;
        }

        GradeComponent gradeComponent = new GradeComponent();

        gradeComponent.setIdGradeComponents( request.getIdGradeComponents() );
        gradeComponent.setName( request.getName() );
        gradeComponent.setWeightPercentage( request.getWeightPercentage() );

        return gradeComponent;
    }

    @Override
    public void updateEntity(GradeComponentRequest request, GradeComponent entity) {
        if ( request == null ) {
            return;
        }

        entity.setName( request.getName() );
        entity.setWeightPercentage( request.getWeightPercentage() );
    }
}
