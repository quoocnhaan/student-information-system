package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SectionRequest {

    @NotBlank(message = "name khong duoc de trong")
    private String name;

    @NotBlank(message = "idClasses khong duoc de trong")
    private String idClasses;
}
