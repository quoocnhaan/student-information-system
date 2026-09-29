package com.example.demo.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SecurityException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Slf4j
@Component
public class JwtUtil {

    @Value("${security.jwt.secret:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}")
    private String secret;

    @Value("${security.jwt.expiration:315360000000}")
    private long expiration;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {
        Claims claims = extractAllClaims(token);
        List<String> roles = new ArrayList<>();

        Object rolesObj = claims.get("roles");
        if (rolesObj instanceof List<?> list) {
            for (Object item : list) {
                if (item != null) {
                    roles.add(normalizeRole(item.toString()));
                }
            }
        }

        Object roleObj = claims.get("role");
        if (roleObj instanceof String roleStr) {
            roles.add(normalizeRole(roleStr));
        } else if (roleObj instanceof List<?> list) {
            for (Object item : list) {
                if (item != null) {
                    roles.add(normalizeRole(item.toString()));
                }
            }
        }

        Object authObj = claims.get("authorities");
        if (authObj instanceof List<?> list) {
            for (Object item : list) {
                if (item != null) {
                    roles.add(normalizeRole(item.toString()));
                }
            }
        }

        if (roles.isEmpty()) {
            roles.add("ROLE_STUDENT");
        }

        return roles;
    }

    public String normalizeRole(String role) {
        if (role == null) return "ROLE_STUDENT";
        String trimmed = role.trim();
        if (!trimmed.toUpperCase().startsWith("ROLE_")) {
            return "ROLE_" + trimmed.toUpperCase();
        }
        return trimmed.toUpperCase();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (SecurityException | MalformedJwtException e) {
            log.error("Invalid JWT signature: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.error("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }

    public String generateToken(String username, String role) {
        return generateToken(username, Collections.singletonList(role));
    }

    public String generateToken(String username, List<String> roles) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);

        List<String> normalizedRoles = roles.stream().map(this::normalizeRole).toList();

        return Jwts.builder()
                .subject(username)
                .claim("role", normalizedRoles.get(0))
                .claim("roles", normalizedRoles)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(getSigningKey())
                .compact();
    }
}
