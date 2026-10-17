package com.spendwise.user;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @JsonIgnore
    @Column(nullable = false)
    private String password;

    @Column(name = "monthly_budget")
    private BigDecimal monthlyBudget = new BigDecimal("25000.00");

    @Column(name = "created_at", nullable = false, updatable = false)
private LocalDateTime createdAt = LocalDateTime.now();

    public User() {}

    public User(String username, String email) {
        this.username = username;
        this.email = email;
        this.password = "";
        this.monthlyBudget = new BigDecimal("25000.00");
        this.createdAt = LocalDateTime.now();
    }

    public User(String username, String email, String password) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.monthlyBudget = new BigDecimal("25000.00");
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public BigDecimal getMonthlyBudget() {
        return monthlyBudget != null ? monthlyBudget : new BigDecimal("25000.00");
    }

    public void setMonthlyBudget(BigDecimal monthlyBudget) {
        this.monthlyBudget = monthlyBudget;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}