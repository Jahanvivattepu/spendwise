package com.spendwise;

import com.spendwise.transaction.Transaction.Category;
import com.spendwise.transaction.Transaction.Type;
import com.spendwise.transaction.TransactionService;
import com.spendwise.user.User;
import com.spendwise.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

@DataJpaTest
@Import(TransactionService.class)
class TransactionServiceTest {

    private static final YearMonth JAN = YearMonth.of(2025, 1);

    @Autowired
    TransactionService service;
    @Autowired
    UserRepository users;

    private User newUser(String email) {
        return users.save(new User(email, "hash"));
    }

    private static TransactionService.Request request(String amount, String description) {
        return new TransactionService.Request(Type.EXPENSE, Category.FOOD, new BigDecimal(amount),
                LocalDate.of(2025, 1, 15), description);
    }

    @Test
    void createdTransactionIsListedForItsOwnerOnly() {
        User a = newUser("a@example.com");
        User b = newUser("b@example.com");
        service.create(a.getId(), request("12.50", "Lunch"));

        assertEquals(1, service.list(a.getId(), JAN).size());
        assertEquals(0, service.list(b.getId(), JAN).size());
    }

    @Test
    void amountIsStoredWithTwoDecimals() {
        User a = newUser("a@example.com");
        var created = service.create(a.getId(), request("10.5", null));
        assertEquals("10.50", created.amount().toPlainString());
    }

    @Test
    void anotherUserCannotUpdateMyTransaction() {
        User a = newUser("a@example.com");
        User b = newUser("b@example.com");
        var created = service.create(a.getId(), request("12.50", "Lunch"));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> service.update(b.getId(), created.id(), request("99.00", "Hacked")));
        assertEquals(404, ex.getStatusCode().value());

        assertEquals("Lunch", service.list(a.getId(), JAN).get(0).description());
    }

    @Test
    void anotherUserCannotDeleteMyTransaction() {
        User a = newUser("a@example.com");
        User b = newUser("b@example.com");
        var created = service.create(a.getId(), request("12.50", "Lunch"));

        assertThrows(ResponseStatusException.class, () -> service.delete(b.getId(), created.id()));
        assertEquals(1, service.list(a.getId(), JAN).size());
    }

    @Test
    void ownerCanUpdateAndDelete() {
        User a = newUser("a@example.com");
        var created = service.create(a.getId(), request("12.50", "Lunch"));

        var updated = service.update(a.getId(), created.id(), request("20.00", "Dinner"));
        assertEquals("Dinner", updated.description());
        assertEquals("20.00", updated.amount().toPlainString());

        service.delete(a.getId(), created.id());
        assertEquals(0, service.list(a.getId(), JAN).size());
    }
}
