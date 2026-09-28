package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassesRequest {

    @NotBlank(message = "idClasses khong duoc de trong")
    private String idClasses;
}
