package com.spendwise;

import com.spendwise.security.JwtService;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtServiceTest {

    private static final String SECRET = "a-test-secret-that-is-at-least-32-characters-long";

    @Test
    void tokenRoundTripsToTheSameUserId() {
        JwtService jwt = new JwtService(SECRET, 60);
        String token = jwt.generate(42L, "a@example.com");
        assertEquals(Optional.of(42L), jwt.parseUserId(token));
    }

    @Test
    void tokenSignedWithAnotherSecretIsRejected() {
        JwtService other = new JwtService("a-completely-different-secret-with-32-plus-chars", 60);
        String forged = other.generate(42L, "a@example.com");
        assertEquals(Optional.empty(), new JwtService(SECRET, 60).parseUserId(forged));
    }

    @Test
    void expiredTokenIsRejected() {
        JwtService jwt = new JwtService(SECRET, -1); // already expired when issued
        String token = jwt.generate(42L, "a@example.com");
        assertEquals(Optional.empty(), jwt.parseUserId(token));
    }

    @Test
    void garbageIsRejected() {
        assertEquals(Optional.empty(), new JwtService(SECRET, 60).parseUserId("not-a-jwt"));
    }

    @Test
    void shortSecretFailsFast() {
        assertThrows(IllegalStateException.class, () -> new JwtService("too-short", 60));
    }
}
