```gherkin
Feature: Transactions

  Background:
    * url baseUrl
    * def email = 'user-' + java.util.UUID.randomUUID() + '@example.com'
    Given path 'api', 'auth', 'register'
    And request { email: '#(email)', password: 'Password123' }
    When method post
    Then status 201
    * def token = response.token
    * configure headers = function() { return { Authorization: 'Bearer ' + karate.get('token') } }

  Scenario: Create, list, update and delete a transaction
    Given path 'api', 'transactions'
    And request { type: 'EXPENSE', category: 'FOOD', amount: 12.50, date: '2025-01-15', description: 'Lunch' }
    When method post
    Then status 201
    And match response == { id: '#number', type: 'EXPENSE', category: 'FOOD', amount: 12.5, date: '2025-01-15', description: 'Lunch' }
    * def txId = response.id

    Given path 'api', 'transactions'
    And param month = '2025-01'
    When method get
    Then status 200
    And match response == '#[1]'
    And match response[0].id == txId
    And match response[0].description == 'Lunch'

    Given path 'api', 'transactions', txId
    And request { type: 'EXPENSE', category: 'TRANSPORT', amount: 20.00, date: '2025-01-16', description: 'Taxi' }
    When method put
    Then status 200
    And match response.category == 'TRANSPORT'
    And match response.amount == 20
    And match response.description == 'Taxi'

    Given path 'api', 'transactions', txId
    When method delete
    Then status 204

    Given path 'api', 'transactions'
    And param month = '2025-01'
    When method get
    Then status 200
    And match response == []

  Scenario: Listing only returns transactions of the requested month
    Given path 'api', 'transactions'
    And request { type: 'INCOME', category: 'SALARY', amount: 1000, date: '2025-01-31' }
    When method post
    Then status 201
    Given path 'api', 'transactions'
    And request { type: 'EXPENSE', category: 'FOOD', amount: 5, date: '2025-02-01' }
    When method post
    Then status 201

    Given path 'api', 'transactions'
    And param month = '2025-01'
    When method get
    Then status 200
    And match response == '#[1]'
    And match response[0].category == 'SALARY'

  Scenario: Invalid transactions are rejected
    Given path 'api', 'transactions'
    And request { type: 'EXPENSE', category: 'FOOD', amount: -5, date: '2025-01-15' }
    When method post
    Then status 400
    Given path 'api', 'transactions'
    And request { type: 'EXPENSE', category: 'CRYPTO', amount: 5, date: '2025-01-15' }
    When method post
    Then status 400
    Given path 'api', 'transactions'
    And request { type: 'EXPENSE', category: 'FOOD', amount: 5 }
    When method post
    Then status 400
    Given path 'api', 'transactions'
    And request { type: 'EXPENSE', category: 'FOOD', amount: 5.123, date: '2025-01-15' }
    When method post
    Then status 400

  Scenario: User B cannot see, change or delete user A's transaction
    Given path 'api', 'transactions'
    And request { type: 'EXPENSE', category: 'FOOD', amount: 12.50, date: '2025-01-15', description: 'A private lunch' }
    When method post
    Then status 201
    * def txId = response.id
    * def tokenA = token

    # Register user B and switch to B's token
    * def emailB = 'user-' + java.util.UUID.randomUUID() + '@example.com'
    Given path 'api', 'auth', 'register'
    And request { email: '#(emailB)', password: 'Password123' }
    When method post
    Then status 201
    * def token = response.token

    Given path 'api', 'transactions'
    And param month = '2025-01'
    When method get
    Then status 200
    And match response == []

    Given path 'api', 'transactions', txId
    And request { type: 'EXPENSE', category: 'FOOD', amount: 99, date: '2025-01-15', description: 'Hacked' }
    When method put
    Then status 404

    Given path 'api', 'transactions', txId
    When method delete
    Then status 404

    # Back to user A: the transaction is untouched
    * def token = tokenA
    Given path 'api', 'transactions'
    And param month = '2025-01'
    When method get
    Then status 200
    And match response == '#[1]'
    And match response[0].description == 'A private lunch'
