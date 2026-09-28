package com.example.activity.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI academicServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Academic Service API Documentation")
                        .description("Tài liệu API và Swagger UI cho dịch vụ Academic Service (Khoa, Ngành, Môn học, Lớp học, Điểm số, Đăng ký môn...)")
                        .version("1.0.0")
                        .contact(new Contact().name("Backend Team"))
                        .license(new License().name("Apache 2.0")));
    }
}
