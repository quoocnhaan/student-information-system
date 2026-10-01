package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.URL;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileRequest {

    @NotBlank(message = "idActivity khong duoc de trong")
    @Size(max = 50, message = "idActivity khong duoc vuot qua 50 ky tu")
    private String idActivity;

    @Size(max = 500, message = "description khong duoc vuot qua 500 ky tu")
    private String description;

    @NotBlank(message = "fileUrl khong duoc de trong")
    @URL(message = "fileUrl phai la mot URL hop le")
    @Size(max = 500, message = "fileUrl khong duoc vuot qua 500 ky tu")
    private String fileUrl;
}
