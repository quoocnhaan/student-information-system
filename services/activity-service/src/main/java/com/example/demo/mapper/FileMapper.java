package com.example.demo.mapper;

import com.example.demo.dto.request.FileRequest;
import com.example.demo.dto.response.FileResponse;
import com.example.demo.entity.FileEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface FileMapper {

    @Mapping(target = "idFile", ignore = true)
    @Mapping(target = "activity", ignore = true)
    FileEntity toEntity(FileRequest request);

    @Mapping(source = "activity.idActivity", target = "idActivity")
    FileResponse toResponse(FileEntity entity);
}
