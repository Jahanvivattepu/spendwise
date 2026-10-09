package com.spendwise.controller;

import com.spendwise.entity.Expense;
import com.spendwise.repository.ExpenseRepository;
import com.spendwise.service.LlmParsingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/expenses")
@CrossOrigin(origins = "*")
public class ExpenseController {

    private final ExpenseRepository expenseRepository;
    private final LlmParsingService llmParsingService;

    public ExpenseController(ExpenseRepository expenseRepository, LlmParsingService llmParsingService) {
        this.expenseRepository = expenseRepository;
        this.llmParsingService = llmParsingService;
    }

    @GetMapping
    public List<Expense> getExpenses() {
        return expenseRepository.findAllByOrderByDateDesc();
    }

    @PostMapping
    public ResponseEntity<Expense> addExpense(@RequestBody Expense expense) {
        if (expense.getDate() == null) {
            expense.setDate(LocalDate.now());
        }
        Expense saved = expenseRepository.save(expense);
        return ResponseEntity.ok(saved);
    }
    @PostMapping("/can-i-afford")
    public ResponseEntity<LlmParsingService.AffordabilityVerdict> canIAfford(
            @RequestBody Map<String, Object> body) {
        
        java.math.BigDecimal budget = new java.math.BigDecimal(body.getOrDefault("budget", "25000").toString());
        java.math.BigDecimal cost = new java.math.BigDecimal(body.getOrDefault("cost", "0").toString());
        String item = body.getOrDefault("item", "Target Purchase").toString();

        java.math.BigDecimal totalSpent = expenseRepository.findAll().stream()
                .map(Expense::getAmount)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        java.time.LocalDate now = java.time.LocalDate.now();
        int daysRemaining = Math.max(1, now.lengthOfMonth() - now.getDayOfMonth());

        LlmParsingService.AffordabilityVerdict verdict = 
                llmParsingService.evaluateAffordability(budget, totalSpent, cost, item, daysRemaining);

        return ResponseEntity.ok(verdict);
    }
    @PostMapping("/parse")
    public ResponseEntity<Expense> parseAndAdd(@RequestBody Map<String, String> payload) {
        String prompt = payload.getOrDefault("prompt", "");
        LlmParsingService.ParsedExpense parsed = llmParsingService.parseNaturalLanguageExpense(prompt);
        
        Expense expense = new Expense(parsed.title(), parsed.amount(), parsed.date());
        Expense saved = expenseRepository.save(expense);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExpense(@PathVariable Long id) {
        expenseRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}