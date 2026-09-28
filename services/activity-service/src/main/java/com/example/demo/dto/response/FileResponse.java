package com.example.demo.dto.response;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FileResponse {
    private String idFile;
    private String idActivity;
    private String description;
    private String fileUrl;
}
