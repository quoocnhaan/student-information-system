package com.example.demo.dto.response;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityResponse {
    private String idActivity;
    private String name;
    private String idSection;
    private String type;
    private LocalDate timeOpen;
    private LocalDate timeClose;
}
