package com.spendwise.user;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class BudgetUpdateRequest {

    @NotNull(message = "Monthly budget is required")
    @DecimalMin(value = "1.00", message = "Budget must be greater than zero")
    private BigDecimal monthlyBudget;

    public BudgetUpdateRequest() {}

    public BudgetUpdateRequest(BigDecimal monthlyBudget) {
        this.monthlyBudget = monthlyBudget;
    }

    public BigDecimal getMonthlyBudget() {
        return monthlyBudget;
    }

    public void setMonthlyBudget(BigDecimal monthlyBudget) {
        this.monthlyBudget = monthlyBudget;
    }
}