package com.example.demo.security;

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
                                "/api/health",
                                "/api/auth/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/api-docs/**",
                                "/error"
                        ).permitAll()

                        // Question & Option management: only ADMIN and LECTURER
                        .requestMatchers("/api/questions/**", "/api/question-options/**").hasAnyRole("ADMIN", "LECTURER")

                        // Quiz Attempts: Student starts test (POST), Student/Lecturer/Admin submits (PUT), Admin deletes
                        .requestMatchers(HttpMethod.POST, "/api/attempts/**").hasRole("STUDENT")
                        .requestMatchers(HttpMethod.PUT, "/api/attempts/**").hasAnyRole("STUDENT", "LECTURER", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/attempts/**").hasRole("ADMIN")

                        // Student Answers: Student answers (POST, PUT), Admin deletes
                        .requestMatchers(HttpMethod.POST, "/api/student-answers/**").hasRole("STUDENT")
                        .requestMatchers(HttpMethod.PUT, "/api/student-answers/**").hasRole("STUDENT")
                        .requestMatchers(HttpMethod.DELETE, "/api/student-answers/**").hasRole("ADMIN")

                        // Assignment Student Approve: Student submits assignment (POST), Lecturer/Admin grades (PUT), Lecturer/Admin deletes
                        .requestMatchers(HttpMethod.POST, "/api/assignment-student-approves/**").hasRole("STUDENT")
                        .requestMatchers(HttpMethod.PUT, "/api/assignment-student-approves/**").hasAnyRole("ADMIN", "LECTURER")
                        .requestMatchers(HttpMethod.DELETE, "/api/assignment-student-approves/**").hasAnyRole("ADMIN", "LECTURER")

                        // Learning content modification (Sections, Activities, Files, Assignments, Quizzes): ADMIN, LECTURER
                        .requestMatchers(HttpMethod.POST, "/api/sections/**", "/api/activities/**", "/api/files/**", "/api/assignments/**", "/api/quizzes/**").hasAnyRole("ADMIN", "LECTURER")
                        .requestMatchers(HttpMethod.PUT, "/api/sections/**", "/api/activities/**", "/api/files/**", "/api/assignments/**", "/api/quizzes/**").hasAnyRole("ADMIN", "LECTURER")
                        .requestMatchers(HttpMethod.DELETE, "/api/sections/**", "/api/activities/**", "/api/files/**", "/api/assignments/**", "/api/quizzes/**").hasAnyRole("ADMIN", "LECTURER")

                        // Classes modification in activity: ADMIN
                        .requestMatchers(HttpMethod.POST, "/api/classes/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/classes/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/classes/**").hasRole("ADMIN")

                        // General GET endpoints for all authenticated users (ADMIN, LECTURER, STUDENT)
                        .requestMatchers(HttpMethod.GET, "/api/**").authenticated()

                        // Any other request must be authenticated
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
