package com.spendwise.transaction;

import com.spendwise.dashboard.DashboardService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** The user id always comes from the JWT (@AuthenticationPrincipal), never from the request. */
@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    private final TransactionService service;

    public TransactionController(TransactionService service) {
        this.service = service;
    }

    @GetMapping
    public List<TransactionService.Response> list(@AuthenticationPrincipal Long userId,
                                                  @RequestParam(required = false) String month) {
        return service.list(userId, DashboardService.parseMonth(month));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionService.Response create(@AuthenticationPrincipal Long userId,
                                              @Valid @RequestBody TransactionService.Request request) {
        return service.create(userId, request);
    }

    @PutMapping("/{id}")
    public TransactionService.Response update(@AuthenticationPrincipal Long userId,
                                              @PathVariable Long id,
                                              @Valid @RequestBody TransactionService.Request request) {
        return service.update(userId, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        service.delete(userId, id);
    }
}
