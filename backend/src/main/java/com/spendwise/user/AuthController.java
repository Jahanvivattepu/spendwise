package com.spendwise.user;

import com.spendwise.security.JwtService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 254) String email,
            @NotBlank @Size(min = 8, max = 72) String password) {
    }

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {
    }

    public record AuthResponse(String token, String email) {
    }

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;

    public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwtService) {
        this.users = users;
        this.encoder = encoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        String email = normalize(request.email());
        if (users.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already registered");
        }
        User user = users.save(new User(email, encoder.encode(request.password())));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new AuthResponse(jwtService.generate(user.getId(), user.getEmail()), user.getEmail()));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        User user = users.findByEmail(normalize(request.email()))
                .filter(u -> encoder.matches(request.password(), u.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
        return new AuthResponse(jwtService.generate(user.getId(), user.getEmail()), user.getEmail());
    }

    private static String normalize(String email) {
        return email.trim().toLowerCase();
    }
}
