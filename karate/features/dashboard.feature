```gherkin
Feature: Dashboard and budget

  Background:
    * url baseUrl
    * def email = 'user-' + java.util.UUID.randomUUID() + '@example.com'
    Given path 'api', 'auth', 'register'
    And request { email: '#(email)', password: 'Password123' }
    When method post
    Then status 201
    * def token = response.token
    * configure headers = function() { return { Authorization: 'Bearer ' + karate.get('token') } }

  Scenario: A new user sees zeros and "no budget"
    Given path 'api', 'dashboard'
    And param month = '2030-01'
    When method get
    Then status 200
    And match response.income == 0
    And match response.expenses == 0
    And match response.balance == 0
    And match response.monthlyBudget == null
    And match response.budgetRemaining == null
    And match response.spendingByCategory == []

  Scenario: Budget and exact totals
    Given path 'api', 'budget'
    And request { monthlyBudget: 1000 }
    When method put
    Then status 200
    And match response.monthlyBudget == 1000

    Given path 'api', 'transactions'
    And request { type: 'INCOME', category: 'SALARY', amount: 2000, date: '2025-03-01' }
    When method post
    Then status 201
    Given path 'api', 'transactions'
    And request { type: 'EXPENSE', category: 'FOOD', amount: 300, date: '2025-03-05' }
    When method post
    Then status 201
    Given path 'api', 'transactions'
    And request { type: 'EXPENSE', category: 'TRANSPORT', amount: 150.50, date: '2025-03-06' }
    When method post
    Then status 201
    Given path 'api', 'transactions'
    And request { type: 'EXPENSE', category: 'FOOD', amount: 49.50, date: '2025-03-31' }
    When method post
    Then status 201
    # Different month: must not affect March
    Given path 'api', 'transactions'
    And request { type: 'EXPENSE', category: 'SHOPPING', amount: 999, date: '2025-04-01' }
    When method post
    Then status 201

    Given path 'api', 'dashboard'
    And param month = '2025-03'
    When method get
    Then status 200
    And match response.month == '2025-03'
    And match response.income == 2000
    And match response.expenses == 500
    And match response.balance == 1500
    And match response.monthlyBudget == 1000
    And match response.budgetRemaining == 500
    And match response.budgetUsedPercent == 50
    And match response.spendingByCategory == [{ category: 'FOOD', total: 349.5 }, { category: 'TRANSPORT', total: 150.5 }]

  Scenario: Invalid budget and invalid month are rejected
    Given path 'api', 'budget'
    And request { monthlyBudget: 0 }
    When method put
    Then status 400
    Given path 'api', 'budget'
    And request { monthlyBudget: -50 }
    When method put
    Then status 400
    Given path 'api', 'dashboard'
    And param month = 'not-a-month'
    When method get
    Then status 400
