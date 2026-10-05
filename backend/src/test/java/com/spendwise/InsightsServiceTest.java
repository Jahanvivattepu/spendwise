package com.spendwise;

import com.spendwise.dashboard.DashboardService;
import com.spendwise.dashboard.DashboardService.CategoryTotal;
import com.spendwise.insights.InsightsService;
import com.spendwise.transaction.Transaction.Category;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

/** No network: tests prompt construction and the "not configured" behaviour only. */
class InsightsServiceTest {

    private static DashboardService.Summary summary(BigDecimal budget) {
        return new DashboardService.Summary("2025-03",
                new BigDecimal("2000.00"), new BigDecimal("500.00"), new BigDecimal("1500.00"),
                budget,
                budget == null ? null : new BigDecimal("500.00"),
                budget == null ? null : new BigDecimal("50.0"),
                List.of(new CategoryTotal(Category.FOOD, new BigDecimal("349.50")),
                        new CategoryTotal(Category.TRANSPORT, new BigDecimal("150.50"))));
    }

    @Test
    void promptContainsTheAggregateFigures() {
        String prompt = InsightsService.buildPrompt(summary(new BigDecimal("1000.00")));

        assertTrue(prompt.contains("2025-03"));
        assertTrue(prompt.contains("2000.00"));
        assertTrue(prompt.contains("500.00"));
        assertTrue(prompt.contains("1000.00"));
        assertTrue(prompt.contains("FOOD: 349.50"));
        assertTrue(prompt.contains("TRANSPORT: 150.50"));
    }

    @Test
    void promptSaysNoBudgetSetWhenThereIsNone() {
        String prompt = InsightsService.buildPrompt(summary(null));
        assertTrue(prompt.contains("No budget set"));
    }

    @Test
    void promptContainsNoPersonalData() {
        String prompt = InsightsService.buildPrompt(summary(null));
        assertFalse(prompt.contains("@"));
    }

    @Test
    void missingConfigurationGivesAnHonest503() {
        InsightsService service = new InsightsService(mock(DashboardService.class), "", "", "");

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.generate(1L, YearMonth.of(2025, 3)));

        assertEquals(503, ex.getStatusCode().value());
    }
}
