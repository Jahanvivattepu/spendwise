package com.spendwise.transaction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findByUserIdAndDateBetweenOrderByDateDescIdDesc(Long userId, LocalDate from, LocalDate to);

    /** Ownership is enforced here: a transaction is only found if it belongs to the user. */
    Optional<Transaction> findByIdAndUserId(Long id, Long userId);
}
