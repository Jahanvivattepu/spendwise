package com.spendwise.dashboard;

import com.spendwise.transaction.Transaction;
import com.spendwise.transaction.TransactionRepository;
import com.spendwise.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

@Service
public class DashboardService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);

    public record CategoryTotal(Transaction.Category category, BigDecimal total) {
    }

    /** monthlyBudget, budgetRemaining and budgetUsedPercent are null when no budget is set. */
    public record Summary(String month, BigDecimal income, BigDecimal expenses, BigDecimal balance,
                          BigDecimal monthlyBudget, BigDecimal budgetRemaining, BigDecimal budgetUsedPercent,
                          List<CategoryTotal> spendingByCategory) {
    }

    private final TransactionRepository transactions;
    private final UserRepository users;

    public DashboardService(TransactionRepository transactions, UserRepository users) {
        this.transactions = transactions;
        this.users = users;
    }

    /** Parses "YYYY-MM". A missing month means the current month. */
    public static YearMonth parseMonth(String month) {
        if (month == null || month.isBlank()) {
            return YearMonth.now();
        }
        try {
            return YearMonth.parse(month);
        } catch (DateTimeParseException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "month must be in YYYY-MM format");
        }
    }

    public Summary summarize(Long userId, YearMonth month) {
        List<Transaction> monthTransactions = transactions
                .findByUserIdAndDateBetweenOrderByDateDescIdDesc(userId, month.atDay(1), month.atEndOfMonth());

        BigDecimal income = sum(monthTransactions, Transaction.Type.INCOME);
        BigDecimal expenses = sum(monthTransactions, Transaction.Type.EXPENSE);

        Map<Transaction.Category, BigDecimal> byCategory = new EnumMap<>(Transaction.Category.class);
        for (Transaction t : monthTransactions) {
            if (t.getType() == Transaction.Type.EXPENSE) {
                byCategory.merge(t.getCategory(), t.getAmount(), BigDecimal::add);
            }
        }
        List<CategoryTotal> categories = byCategory.entrySet().stream()
                .map(e -> new CategoryTotal(e.getKey(), e.getValue()))
                .sorted(Comparator.comparing(CategoryTotal::total).reversed())
                .toList();

        BigDecimal budget = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"))
                .getMonthlyBudget();

        BigDecimal remaining = null;
        BigDecimal usedPercent = null;
        if (budget != null) {
            remaining = budget.subtract(expenses);
            usedPercent = expenses.multiply(BigDecimal.valueOf(100)).divide(budget, 1, RoundingMode.HALF_UP);
        }

        return new Summary(month.toString(), income, expenses, income.subtract(expenses),
                budget, remaining, usedPercent, categories);
    }

    public BigDecimal setBudget(Long userId, BigDecimal amount) {
        var user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        user.setMonthlyBudget(amount.setScale(2, RoundingMode.HALF_UP));
        return users.save(user).getMonthlyBudget();
    }

    private static BigDecimal sum(List<Transaction> list, Transaction.Type type) {
        return list.stream()
                .filter(t -> t.getType() == type)
                .map(Transaction::getAmount)
                .reduce(ZERO, BigDecimal::add);
    }
}
