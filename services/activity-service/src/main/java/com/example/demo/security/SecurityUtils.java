package com.example.demo.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static Optional<Authentication> getAuthentication() {
        return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication());
    }

    public static String getCurrentUsername() {
        return getAuthentication()
                .filter(Authentication::isAuthenticated)
                .map(Authentication::getName)
                .orElse(null);
    }

    public static boolean isCurrentUserStudent() {
        return getAuthentication()
                .map(auth -> auth.getAuthorities().stream()
                        .anyMatch(a -> "ROLE_STUDENT".equals(a.getAuthority())))
                .orElse(false);
    }

    public static boolean isCurrentUserAdmin() {
        return getAuthentication()
                .map(auth -> auth.getAuthorities().stream()
                        .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority())))
                .orElse(false);
    }

    public static boolean isCurrentUserLecturer() {
        return getAuthentication()
                .map(auth -> auth.getAuthorities().stream()
                        .anyMatch(a -> "ROLE_LECTURER".equals(a.getAuthority())))
                .orElse(false);
    }

    public static void checkStudentAccess(String studentId, String actionDescription) {
        if (isCurrentUserStudent()) {
            String currentUsername = getCurrentUsername();
            if (currentUsername != null && studentId != null && !currentUsername.equals(studentId)) {
                throw new AccessDeniedException("Access Denied: You cannot " + actionDescription + " of another student");
            }
        }
    }
}
