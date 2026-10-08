package com.example.activity.mapper;

import com.example.activity.dto.response.ClassesGradeComponentResponse;
import com.example.activity.entity.Classes;
import com.example.activity.entity.ClassesGradeComponent;
import com.example.activity.entity.GradeComponent;
import javax.annotation.processing.Generated;
import org.springframework.stereotype.Component;

@Generated(
    value = "org.mapstruct.ap.MappingProcessor",
    date = "2026-10-07T22:16:19+0700",
    comments = "version: 1.5.5.Final, compiler: javac, environment: Java 21.0.10 (Oracle Corporation)"
)
@Component
public class ClassesGradeComponentMapperImpl implements ClassesGradeComponentMapper {

    @Override
    public ClassesGradeComponentResponse toResponse(ClassesGradeComponent entity) {
        if ( entity == null ) {
            return null;
        }

        ClassesGradeComponentResponse classesGradeComponentResponse = new ClassesGradeComponentResponse();

        classesGradeComponentResponse.setIdClasses( entityClassesIdClasses( entity ) );
        classesGradeComponentResponse.setIdGradeComponents( entityGradeComponentIdGradeComponents( entity ) );

        return classesGradeComponentResponse;
    }

    private String entityClassesIdClasses(ClassesGradeComponent classesGradeComponent) {
        if ( classesGradeComponent == null ) {
            return null;
        }
        Classes classes = classesGradeComponent.getClasses();
        if ( classes == null ) {
            return null;
        }
        String idClasses = classes.getIdClasses();
        if ( idClasses == null ) {
            return null;
        }
        return idClasses;
    }

    private String entityGradeComponentIdGradeComponents(ClassesGradeComponent classesGradeComponent) {
        if ( classesGradeComponent == null ) {
            return null;
        }
        GradeComponent gradeComponent = classesGradeComponent.getGradeComponent();
        if ( gradeComponent == null ) {
            return null;
        }
        String idGradeComponents = gradeComponent.getIdGradeComponents();
        if ( idGradeComponents == null ) {
            return null;
        }
        return idGradeComponents;
    }
}
