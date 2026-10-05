package com.spendwise.transaction;

import com.spendwise.user.UserRepository;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
@Transactional
public class TransactionService {

    public record Request(
            @NotNull Transaction.Type type,
            @NotNull Transaction.Category category,
            @NotNull @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal amount,
            @NotNull LocalDate date,
            @Size(max = 255) String description) {
    }

    public record Response(Long id, Transaction.Type type, Transaction.Category category,
                           BigDecimal amount, LocalDate date, String description) {
        static Response from(Transaction t) {
            return new Response(t.getId(), t.getType(), t.getCategory(), t.getAmount(), t.getDate(), t.getDescription());
        }
    }

    private final TransactionRepository transactions;
    private final UserRepository users;

    public TransactionService(TransactionRepository transactions, UserRepository users) {
        this.transactions = transactions;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<Response> list(Long userId, YearMonth month) {
        return transactions
                .findByUserIdAndDateBetweenOrderByDateDescIdDesc(userId, month.atDay(1), month.atEndOfMonth())
                .stream().map(Response::from).toList();
    }

    public Response create(Long userId, Request r) {
        Transaction t = new Transaction(users.getReferenceById(userId), r.type(), r.category(),
                money(r.amount()), r.date(), clean(r.description()));
        return Response.from(transactions.save(t));
    }

    public Response update(Long userId, Long id, Request r) {
        Transaction t = findOwned(userId, id);
        t.update(r.type(), r.category(), money(r.amount()), r.date(), clean(r.description()));
        return Response.from(t);
    }

    public void delete(Long userId, Long id) {
        transactions.delete(findOwned(userId, id));
    }

    private Transaction findOwned(Long userId, Long id) {
        // 404 (not 403) so users cannot even discover that someone else's id exists.
        return transactions.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Transaction not found"));
    }

    private static BigDecimal money(BigDecimal amount) {
        return amount.setScale(2, RoundingMode.HALF_UP);
    }

    private static String clean(String description) {
        return (description == null || description.isBlank()) ? null : description.trim();
    }
}
