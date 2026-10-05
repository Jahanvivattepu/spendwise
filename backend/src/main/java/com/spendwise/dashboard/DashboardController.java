package com.spendwise.dashboard;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class DashboardController {

    public record BudgetRequest(
            @NotNull @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal monthlyBudget) {
    }

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping("/dashboard")
    public DashboardService.Summary dashboard(@AuthenticationPrincipal Long userId,
                                              @RequestParam(required = false) String month) {
        return service.summarize(userId, DashboardService.parseMonth(month));
    }

    @PutMapping("/budget")
    public Map<String, BigDecimal> setBudget(@AuthenticationPrincipal Long userId,
                                             @Valid @RequestBody BudgetRequest request) {
        return Map.of("monthlyBudget", service.setBudget(userId, request.monthlyBudget()));
    }
}
