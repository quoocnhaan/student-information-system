package com.example.activity.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String SECURITY_SCHEME_NAME = "BearerAuth";

    @Bean
    public OpenAPI academicServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Academic Service API Documentation")
                        .description("Tài liệu API và Swagger UI cho dịch vụ Academic Service (Khoa, Ngành, Môn học, Lớp học, Điểm số, Đăng ký môn...) - Tích hợp JWT RBAC")
                        .version("1.0.0")
                        .contact(new Contact().name("Backend Team"))
                        .license(new License().name("Apache 2.0")))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME,
                                new SecurityScheme()
                                        .name(SECURITY_SCHEME_NAME)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Nhập JWT Token cố định (không cần gõ tiền tố 'Bearer ', chỉ cần dán token).")));
    }
}
