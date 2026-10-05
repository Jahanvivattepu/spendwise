package com.spendwise;

import com.spendwise.dashboard.DashboardService;
import com.spendwise.transaction.Transaction;
import com.spendwise.transaction.Transaction.Category;
import com.spendwise.transaction.Transaction.Type;
import com.spendwise.transaction.TransactionRepository;
import com.spendwise.user.User;
import com.spendwise.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@DataJpaTest
@Import(DashboardService.class)
class DashboardServiceTest {

    private static final YearMonth MARCH = YearMonth.of(2025, 3);

    @Autowired
    DashboardService dashboard;
    @Autowired
    UserRepository users;
    @Autowired
    TransactionRepository transactions;

    private User newUser(String email) {
        return users.save(new User(email, "hash"));
    }

    private void add(User user, Type type, Category category, String amount, String date) {
        transactions.save(new Transaction(user, type, category, new BigDecimal(amount), LocalDate.parse(date), null));
    }

    private static void assertMoney(String expected, BigDecimal actual) {
        assertEquals(0, new BigDecimal(expected).compareTo(actual), "expected " + expected + " but was " + actual);
    }

    @Test
    void calculatesTotalsAndCategoriesForTheMonthOnly() {
        User a = newUser("a@example.com");
        User b = newUser("b@example.com");
        add(a, Type.INCOME, Category.SALARY, "2000.00", "2025-03-01");
        add(a, Type.EXPENSE, Category.FOOD, "300.00", "2025-03-05");
        add(a, Type.EXPENSE, Category.TRANSPORT, "150.50", "2025-03-06");
        add(a, Type.EXPENSE, Category.FOOD, "49.50", "2025-03-31");
        add(a, Type.EXPENSE, Category.SHOPPING, "999.00", "2025-04-01"); // other month
        add(b, Type.EXPENSE, Category.FOOD, "777.00", "2025-03-10");     // other user

        var s = dashboard.summarize(a.getId(), MARCH);

        assertEquals("2025-03", s.month());
        assertMoney("2000.00", s.income());
        assertMoney("500.00", s.expenses());
        assertMoney("1500.00", s.balance());
        assertEquals(2, s.spendingByCategory().size());
        assertEquals(Category.FOOD, s.spendingByCategory().get(0).category());
        assertMoney("349.50", s.spendingByCategory().get(0).total());
        assertEquals(Category.TRANSPORT, s.spendingByCategory().get(1).category());
        assertMoney("150.50", s.spendingByCategory().get(1).total());
    }

    @Test
    void emptyMonthReturnsZerosAndNoBudget() {
        User a = newUser("a@example.com");

        var s = dashboard.summarize(a.getId(), MARCH);

        assertMoney("0", s.income());
        assertMoney("0", s.expenses());
        assertMoney("0", s.balance());
        assertTrue(s.spendingByCategory().isEmpty());
        assertNull(s.monthlyBudget());
        assertNull(s.budgetRemaining());
        assertNull(s.budgetUsedPercent());
    }

    @Test
    void budgetStatusIsDerivedFromExpenses() {
        User a = newUser("a@example.com");
        add(a, Type.EXPENSE, Category.FOOD, "500.00", "2025-03-05");
        dashboard.setBudget(a.getId(), new BigDecimal("1000"));

        var s = dashboard.summarize(a.getId(), MARCH);

        assertMoney("1000.00", s.monthlyBudget());
        assertMoney("500.00", s.budgetRemaining());
        assertMoney("50.0", s.budgetUsedPercent());
    }

    @Test
    void overspendingGivesNegativeRemainingAndOver100Percent() {
        User a = newUser("a@example.com");
        add(a, Type.EXPENSE, Category.HOUSING, "1200.00", "2025-03-05");
        dashboard.setBudget(a.getId(), new BigDecimal("1000"));

        var s = dashboard.summarize(a.getId(), MARCH);

        assertMoney("-200.00", s.budgetRemaining());
        assertMoney("120.0", s.budgetUsedPercent());
    }
}
