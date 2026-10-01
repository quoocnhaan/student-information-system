package com.example.activity.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    private final CustomAccessDeniedHandler customAccessDeniedHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                        .accessDeniedHandler(customAccessDeniedHandler)
                )
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers(
                                "/health",
                                "/api/health",
                                "/api/auth/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/api-docs/**",
                                "/error"
                        ).permitAll()

                        // General GET endpoints for all authenticated users (ADMIN, LECTURER, STUDENT)
                        .requestMatchers(HttpMethod.GET, "/api/**").authenticated()

                        // Classes Grade Components: ADMIN, LECTURER
                        .requestMatchers(HttpMethod.POST, "/api/classes-grade-components/**").hasAnyRole("ADMIN", "LECTURER")
                        .requestMatchers(HttpMethod.PUT, "/api/classes-grade-components/**").hasAnyRole("ADMIN", "LECTURER")
                        .requestMatchers(HttpMethod.DELETE, "/api/classes-grade-components/**").hasAnyRole("ADMIN", "LECTURER")

                        // Student Scores: POST/PUT by ADMIN or LECTURER; DELETE by ADMIN
                        .requestMatchers(HttpMethod.POST, "/api/student-scores/**").hasAnyRole("ADMIN", "LECTURER")
                        .requestMatchers(HttpMethod.PUT, "/api/student-scores/**").hasAnyRole("ADMIN", "LECTURER")
                        .requestMatchers(HttpMethod.DELETE, "/api/student-scores/**").hasRole("ADMIN")

                        // Student Enrollments: POST by ADMIN or STUDENT; PUT/DELETE by ADMIN
                        .requestMatchers(HttpMethod.POST, "/api/student-enrollments/**").hasAnyRole("ADMIN", "STUDENT")
                        .requestMatchers(HttpMethod.PUT, "/api/student-enrollments/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/student-enrollments/**").hasRole("ADMIN")

                        // Admin-only management endpoints (POST, PUT, DELETE)
                        .requestMatchers(HttpMethod.POST,
                                "/api/faculties/**",
                                "/api/majors/**",
                                "/api/courses/**",
                                "/api/semesters/**",
                                "/api/classes/**",
                                "/api/grade-components/**",
                                "/api/exam-schedules/**",
                                "/api/exam-students/**"
                        ).hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT,
                                "/api/faculties/**",
                                "/api/majors/**",
                                "/api/courses/**",
                                "/api/semesters/**",
                                "/api/classes/**",
                                "/api/grade-components/**",
                                "/api/exam-schedules/**",
                                "/api/exam-students/**"
                        ).hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE,
                                "/api/faculties/**",
                                "/api/majors/**",
                                "/api/courses/**",
                                "/api/semesters/**",
                                "/api/classes/**",
                                "/api/grade-components/**",
                                "/api/exam-schedules/**",
                                "/api/exam-students/**"
                        ).hasRole("ADMIN")

                        // Any other request must be authenticated
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
