package com.example.demo.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SectionResponse {
    private String idSection;
    private String name;
    private String idClasses;
}
