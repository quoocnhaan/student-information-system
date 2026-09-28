package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileRequest {

    @NotBlank(message = "idActivity khong duoc de trong")
    private String idActivity;

    private String description;

    @NotBlank(message = "fileUrl khong duoc de trong")
    private String fileUrl;
}
