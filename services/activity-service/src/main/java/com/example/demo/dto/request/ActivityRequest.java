package com.example.demo.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityRequest {

    @NotBlank(message = "name khong duoc de trong")
    private String name;

    @NotBlank(message = "idSection khong duoc de trong")
    private String idSection;

    @NotBlank(message = "type khong duoc de trong")
    private String type;

    private LocalDate timeOpen;

    private LocalDate timeClose;
}
