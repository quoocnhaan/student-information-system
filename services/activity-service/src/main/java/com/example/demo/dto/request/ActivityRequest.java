package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityRequest {

    @NotBlank(message = "name khong duoc de trong")
    @Size(max = 255, message = "name khong duoc vuot qua 255 ky tu")
    private String name;

    @NotBlank(message = "idSection khong duoc de trong")
    @Size(max = 50, message = "idSection khong duoc vuot qua 50 ky tu")
    private String idSection;

    @NotBlank(message = "type khong duoc de trong")
    @Size(max = 50, message = "type khong duoc vuot qua 50 ky tu")
    private String type;

    private LocalDate timeOpen;

    private LocalDate timeClose;
}
