package com.spendwise.controller;

import com.spendwise.security.JwtService;
import com.spendwise.user.User;
import com.spendwise.user.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String username = body.getOrDefault("username", "").trim();
        String email = body.getOrDefault("email", "").trim();
        String password = body.getOrDefault("password", "").trim();

        if (username.isBlank() || email.isBlank() || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username, email, and password are required."));
        }

        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username is already taken."));
        }

        if (userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is already registered."));
        }

        User newUser = new User(username, email, passwordEncoder.encode(password));
        userRepository.save(newUser);

        String token = jwtService.generateToken(username);
        return ResponseEntity.ok(Map.of(
                "token", token,
                "username", username,
                "email", email
        ));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String username = body.getOrDefault("username", "").trim();
        String password = body.getOrDefault("password", "").trim();

        var userOpt = userRepository.findByUsername(username);
        if (userOpt.isEmpty() || !passwordEncoder.matches(password, userOpt.get().getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid username or password."));
        }

        User user = userOpt.get();
        String token = jwtService.generateToken(username);

        return ResponseEntity.ok(Map.of(
                "token", token,
                "username", user.getUsername(),
                "email", user.getEmail()
        ));
    }
}