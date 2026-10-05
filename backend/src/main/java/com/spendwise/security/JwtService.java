package com.spendwise.security;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtService {

    private final SecretKey key;
    private final long expiryMinutes;

    public JwtService(@Value("${jwt.secret}") String secret,
                      @Value("${jwt.expiry-minutes}") long expiryMinutes) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET must be set and at least 32 characters long");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.expiryMinutes = expiryMinutes;
    }

    public String generate(Long userId, String email) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("email", email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expiryMinutes, ChronoUnit.MINUTES)))
                .signWith(key)
                .compact();
    }

    /** Returns the user id if the token is valid, correctly signed and not expired. */
    public Optional<Long> parseUserId(String token) {
        try {
            String subject = Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token)
                    .getPayload()
                    .getSubject();
            return Optional.of(Long.valueOf(subject));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
