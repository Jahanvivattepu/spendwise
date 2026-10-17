package com.spendwise.controller;

import com.spendwise.entity.Expense;
import com.spendwise.repository.ExpenseRepository;
import com.spendwise.security.JwtService;
import com.spendwise.service.LlmParsingService;
import com.spendwise.user.User;
import com.spendwise.user.UserRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/expenses")
@CrossOrigin(origins = "*")
public class ExpenseController {

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final LlmParsingService llmParsingService;
    private final JwtService jwtService;

    public ExpenseController(
            ExpenseRepository expenseRepository,
            UserRepository userRepository,
            LlmParsingService llmParsingService,
            JwtService jwtService) {
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.llmParsingService = llmParsingService;
        this.jwtService = jwtService;
    }

    private User getAuthenticatedUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("Unauthorized user");
        }
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping
    public List<Expense> getExpenses(Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        return expenseRepository.findAllByUserOrderByDateDesc(user);
    }

    @PostMapping
    public ResponseEntity<Expense> addExpense(@RequestBody Expense expense, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        if (expense.getDate() == null) {
            expense.setDate(LocalDate.now());
        }
        if (expense.getCategory() == null || expense.getCategory().isBlank()) {
            expense.setCategory(llmParsingService.inferCategoryFromTitle(expense.getTitle()));
        }
        expense.setUser(user);
        Expense saved = expenseRepository.save(expense);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/parse")
    public ResponseEntity<Expense> parseAndAdd(@RequestBody Map<String, String> payload, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        String prompt = payload.getOrDefault("prompt", "");
        LlmParsingService.ParsedExpense parsed = llmParsingService.parseNaturalLanguageExpense(prompt);

        Expense expense = new Expense(parsed.title(), parsed.amount(), parsed.date(), parsed.category(), user);
        Expense saved = expenseRepository.save(expense);
        return ResponseEntity.ok(saved);
    }

    @PostMapping("/can-i-afford")
    public ResponseEntity<LlmParsingService.AffordabilityVerdict> canIAfford(
            @RequestBody Map<String, Object> body,
            Authentication authentication) {
        User user = getAuthenticatedUser(authentication);

        BigDecimal budget = new BigDecimal(body.getOrDefault("budget", "25000").toString());
        BigDecimal cost = new BigDecimal(body.getOrDefault("cost", "0").toString());
        String item = body.getOrDefault("item", "Target Purchase").toString();

        BigDecimal totalSpent = expenseRepository.findAllByUser(user).stream()
                .map(Expense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        LocalDate now = LocalDate.now();
        int daysRemaining = Math.max(1, now.lengthOfMonth() - now.getDayOfMonth());

        LlmParsingService.AffordabilityVerdict verdict =
                llmParsingService.evaluateAffordability(budget, totalSpent, cost, item, daysRemaining);

        return ResponseEntity.ok(verdict);
    }

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportCsv(@RequestParam(value = "token", required = false) String queryToken, Authentication authentication) {
        User user;
        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getName())) {
            user = getAuthenticatedUser(authentication);
        } else if (queryToken != null && !queryToken.isBlank()) {
            String username = jwtService.extractUsername(queryToken);
            user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Invalid token user"));
        } else {
            return ResponseEntity.status(401).build();
        }

        List<Expense> expenses = expenseRepository.findAllByUserOrderByDateDesc(user);
        StringBuilder csv = new StringBuilder();
        csv.append("ID,Date,Title,Category,Amount\n");

        for (Expense e : expenses) {
            csv.append(e.getId()).append(",")
               .append(e.getDate()).append(",")
               .append("\"").append(e.getTitle().replace("\"", "\"\"")).append("\",")
               .append("\"").append(e.getCategory()).append("\",")
               .append(e.getAmount()).append("\n");
        }

        byte[] output = csv.toString().getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"spendwise_transactions.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(output);
    }

    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importCsv(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        List<Expense> toSave = new ArrayList<>();
        int skipped = 0;

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            boolean isHeader = true;

            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                if (isHeader) {
                    isHeader = false;
                    continue;
                }

                String[] tokens = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)");
                if (tokens.length >= 3) {
                    try {
                        String title = tokens[tokens.length >= 5 ? 2 : 1].replace("\"", "").trim();
                        BigDecimal amount = new BigDecimal(tokens[tokens.length - 1].replace("\"", "").trim());
                        LocalDate date = LocalDate.parse(tokens[tokens.length >= 5 ? 1 : 0].replace("\"", "").trim());
                        String category = tokens.length >= 5
                                ? tokens[3].replace("\"", "").trim()
                                : llmParsingService.inferCategoryFromTitle(title);

                        toSave.add(new Expense(title, amount, date, category, user));
                    } catch (Exception parseEx) {
                        skipped++;
                    }
                } else {
                    skipped++;
                }
            }

            expenseRepository.saveAll(toSave);
            return ResponseEntity.ok(Map.of("imported", toSave.size(), "skipped", skipped));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Failed to parse CSV file: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExpense(@PathVariable Long id, Authentication authentication) {
        User user = getAuthenticatedUser(authentication);
        expenseRepository.findById(id).ifPresent(exp -> {
            if (exp.getUser() != null && exp.getUser().getId().equals(user.getId())) {
                expenseRepository.delete(exp);
            }
        });
        return ResponseEntity.noContent().build();
    }
}