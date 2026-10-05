```gherkin
Feature: Authentication

  Background:
    * url baseUrl
    * def email = 'user-' + java.util.UUID.randomUUID() + '@example.com'
    * def password = 'Password123'

  Scenario: Register a new user
    Given path 'api', 'auth', 'register'
    And request { email: '#(email)', password: '#(password)' }
    When method post
    Then status 201
    And match response.token == '#string'
    And match response.email == email

  Scenario: Registering the same email twice is rejected
    Given path 'api', 'auth', 'register'
    And request { email: '#(email)', password: '#(password)' }
    When method post
    Then status 201
    Given path 'api', 'auth', 'register'
    And request { email: '#(email)', password: '#(password)' }
    When method post
    Then status 409
    And match response.error == '#string'

  Scenario: Registration validates email and password
    Given path 'api', 'auth', 'register'
    And request { email: 'not-an-email', password: '#(password)' }
    When method post
    Then status 400
    Given path 'api', 'auth', 'register'
    And request { email: '#(email)', password: 'short' }
    When method post
    Then status 400

  Scenario: Login with correct credentials returns a token
    Given path 'api', 'auth', 'register'
    And request { email: '#(email)', password: '#(password)' }
    When method post
    Then status 201
    Given path 'api', 'auth', 'login'
    And request { email: '#(email)', password: '#(password)' }
    When method post
    Then status 200
    And match response.token == '#string'

  Scenario: Login with a wrong password is rejected
    Given path 'api', 'auth', 'register'
    And request { email: '#(email)', password: '#(password)' }
    When method post
    Then status 201
    Given path 'api', 'auth', 'login'
    And request { email: '#(email)', password: 'WrongPassword1' }
    When method post
    Then status 401

  Scenario: Protected endpoints return 401 without a valid token
    Given path 'api', 'transactions'
    When method get
    Then status 401
    Given path 'api', 'dashboard'
    When method get
    Then status 401
    Given path 'api', 'insights'
    When method post
    Then status 401
    Given path 'api', 'transactions'
    And header Authorization = 'Bearer not-a-real-token'
    When method get
    Then status 401

  Scenario: Health endpoint is public
    Given path 'api', 'health'
    When method get
    Then status 200
    And match response.status == 'UP'
