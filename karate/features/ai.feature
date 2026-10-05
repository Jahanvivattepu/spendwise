```gherkin
@ai
Feature: AI insights (MANUAL ONLY - excluded from the Jenkins gate with -t ~@ai)

  # Requires LLM_API_URL, LLM_MODEL and LLM_API_KEY to be set on the running backend.
  # Asserts only that a non-empty string comes back, never the wording.

  Background:
    * url baseUrl
    * def email = 'user-' + java.util.UUID.randomUUID() + '@example.com'
    Given path 'api', 'auth', 'register'
    And request { email: '#(email)', password: 'Password123' }
    When method post
    Then status 201
    * def token = response.token
    * configure headers = function() { return { Authorization: 'Bearer ' + karate.get('token') } }

  Scenario: Insight is generated for a month with data
    Given path 'api', 'transactions'
    And request { type: 'INCOME', category: 'SALARY', amount: 2000, date: '2025-03-01' }
    When method post
    Then status 201
    Given path 'api', 'transactions'
    And request { type: 'EXPENSE', category: 'FOOD', amount: 300, date: '2025-03-05' }
    When method post
    Then status 201

    Given path 'api', 'insights'
    And param month = '2025-03'
    When method post
    Then status 200
    And match response.insight == '#string'
    And assert response.insight.length > 0
