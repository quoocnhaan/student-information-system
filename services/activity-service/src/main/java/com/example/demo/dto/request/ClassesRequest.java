package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassesRequest {

    @NotBlank(message = "idClasses khong duoc de trong")
    @Size(max = 50, message = "idClasses khong duoc vuot qua 50 ky tu")
    private String idClasses;
}
