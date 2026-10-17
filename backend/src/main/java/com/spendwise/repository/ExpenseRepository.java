package com.spendwise.repository;

import com.spendwise.entity.Expense;
import com.spendwise.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findAllByUserOrderByDateDesc(User user);
    List<Expense> findAllByUser(User user);
}