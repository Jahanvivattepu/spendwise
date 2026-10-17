package com.spendwise.user;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .<ResponseEntity<?>>map(user -> ResponseEntity.ok(Map.of(
                        "username", user.getUsername(),
                        "email", user.getEmail(),
                        "monthlyBudget", user.getMonthlyBudget()
                )))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/budget")
    public ResponseEntity<?> updateMonthlyBudget(
            Authentication authentication,
            @RequestBody Map<String, BigDecimal> payload
    ) {
        BigDecimal newBudget = payload.get("monthlyBudget");
        if (newBudget == null || newBudget.compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Valid monthlyBudget is required"));
        }

        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .<ResponseEntity<?>>map(user -> {
                    user.setMonthlyBudget(newBudget);
                    userRepository.save(user);
                    return ResponseEntity.ok(Map.of(
                            "message", "Budget updated successfully",
                            "monthlyBudget", user.getMonthlyBudget()
                    ));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}