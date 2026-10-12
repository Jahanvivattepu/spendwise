package com.spendwise.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Service
public class LlmParsingService {

    @Value("${LLM_API_URL:https://api.openai.com/v1/chat/completions}")
    private String apiUrl;

    @Value("${LLM_API_KEY:}")
    private String apiKey;

    @Value("${LLM_MODEL:gpt-4o-mini}")
    private String modelName;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public record ParsedExpense(String title, BigDecimal amount, LocalDate date, String category) {}
    public record AffordabilityVerdict(boolean affordable, String recommendation) {}

    public ParsedExpense parseNaturalLanguageExpense(String text) {
        if (apiKey == null || apiKey.isBlank()) {
            return fallbackParse(text);
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            String prompt = String.format("""
                Extract expense details from this statement.
                Today's date is %s.
                Choose category strictly from: ['Food & Dining', 'Travel & Transit', 'Entertainment', 'Utilities', 'Academics & Tech', 'Miscellaneous'].
                Statement: "%s"

                Respond ONLY with JSON:
                {"title": "short item name", "amount": 123.45, "date": "YYYY-MM-DD", "category": "Food & Dining"}
                """, LocalDate.now(), text);

            Map<String, Object> message = Map.of("role", "user", "content", prompt);
            Map<String, Object> body = Map.of(
                "model", modelName,
                "messages", new Object[]{message},
                "temperature", 0.1
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, request, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                String content = root.path("choices").get(0).path("message").path("content").asText().trim();
                
                if (content.startsWith("```")) {
                    content = content.replaceAll("```json|```", "").trim();
                }

                JsonNode parsedJson = objectMapper.readTree(content);
                String title = parsedJson.path("title").asText("Quick Expense");
                BigDecimal amount = new BigDecimal(parsedJson.path("amount").asText("0"));
                String dateStr = parsedJson.path("date").asText(LocalDate.now().toString());
                String category = parsedJson.path("category").asText(inferCategoryFromTitle(title));

                return new ParsedExpense(title, amount, LocalDate.parse(dateStr), category);
            }
        } catch (Exception e) {
            System.err.println("LLM call failed, using rule engine: " + e.getMessage());
        }

        return fallbackParse(text);
    }

    public String inferCategoryFromTitle(String title) {
        String lower = title.toLowerCase();
        if (lower.matches(".*(swiggy|zomato|canteen|food|coffee|chai|tea|dinner|lunch|breakfast|pizza|burger|snack).*")) {
            return "Food & Dining";
        } else if (lower.matches(".*(metro|uber|ola|auto|cab|bus|petrol|fuel|ticket|train|transit).*")) {
            return "Travel & Transit";
        } else if (lower.matches(".*(movie|netflix|cinema|game|spotify|concert|show).*")) {
            return "Entertainment";
        } else if (lower.matches(".*(aws|wifi|recharge|electricity|bill|rent|water).*")) {
            return "Utilities";
        } else if (lower.matches(".*(book|course|udemy|college|exam|fee|laptop|keyboard|mouse|monitor).*")) {
            return "Academics & Tech";
        }
        return "Miscellaneous";
    }

    private ParsedExpense fallbackParse(String text) {
        BigDecimal extractedAmount = BigDecimal.ZERO;
        String cleanTitle = text.trim();

        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile("(\\d+(\\.\\d{1,2})?)").matcher(text);
        if (matcher.find()) {
            extractedAmount = new BigDecimal(matcher.group(1));
            cleanTitle = text.replace(matcher.group(1), "").replaceAll("(?i)(rs|inr|rupees|spent|paid|for|on)", "").trim();
        }

        if (cleanTitle.isBlank()) cleanTitle = "Quick Expense";
        String category = inferCategoryFromTitle(cleanTitle);

        return new ParsedExpense(cleanTitle, extractedAmount, LocalDate.now(), category);
    }

    public AffordabilityVerdict evaluateAffordability(
            BigDecimal budget,
            BigDecimal currentSpent,
            BigDecimal itemCost,
            String itemName,
            int remainingDays) {

        BigDecimal remainingBudget = budget.subtract(currentSpent);
        BigDecimal projectedRemaining = remainingBudget.subtract(itemCost);
        BigDecimal currentDailyAllowance = remainingDays > 0 
                ? remainingBudget.divide(BigDecimal.valueOf(remainingDays), 2, java.math.RoundingMode.HALF_UP) 
                : BigDecimal.ZERO;
        BigDecimal newDailyAllowance = remainingDays > 0 
                ? projectedRemaining.divide(BigDecimal.valueOf(remainingDays), 2, java.math.RoundingMode.HALF_UP) 
                : BigDecimal.ZERO;

        boolean canAfford = projectedRemaining.compareTo(BigDecimal.ZERO) >= 0;

        if (apiKey == null || apiKey.isBlank()) {
            String quickAdvice = canAfford
                ? String.format("Yes, you can afford %s. Your daily safe spending pace will reduce from ₹%s to ₹%s for the remaining %d days.", 
                    itemName, currentDailyAllowance, newDailyAllowance, remainingDays)
                : String.format("Not recommended. Buying %s (₹%s) will push you ₹%s over your monthly target.", 
                    itemName, itemCost, projectedRemaining.abs(), remainingDays);
            return new AffordabilityVerdict(canAfford, quickAdvice);
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            String prompt = String.format("""
                You are a practical, direct personal finance advisor.
                Budget Context:
                - Monthly Target: ₹%s
                - Already Spent: ₹%s
                - Remaining Budget: ₹%s
                - Days Left in Month: %d
                - Current Daily Allowance: ₹%s / day
                - Proposed Purchase: "%s" costing ₹%s
                - New Daily Allowance if purchased: ₹%s / day

                Give a concise, direct 2-sentence verdict. State clearly whether to buy or postpone and highlight the impact on their daily runway.
                Return JSON only: {"affordable": %b, "recommendation": "your 2-sentence advice"}
                """, budget, currentSpent, remainingBudget, remainingDays, currentDailyAllowance, itemName, itemCost, newDailyAllowance, canAfford);

            Map<String, Object> message = Map.of("role", "user", "content", prompt);
            Map<String, Object> body = Map.of(
                "model", modelName,
                "messages", new Object[]{message},
                "temperature", 0.2
            );

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, request, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                String content = root.path("choices").get(0).path("message").path("content").asText().trim();
                if (content.startsWith("```")) {
                    content = content.replaceAll("```json|```", "").trim();
                }
                JsonNode parsedJson = objectMapper.readTree(content);
                return new AffordabilityVerdict(
                    parsedJson.path("affordable").asBoolean(canAfford),
                    parsedJson.path("recommendation").asText()
                );
            }
        } catch (Exception e) {
            System.err.println("Affordability LLM call failed, using rule engine: " + e.getMessage());
        }

        String fallbackAdvice = canAfford
            ? String.format("You can afford this item. Your daily allowance will decrease from ₹%s to ₹%s for the remaining %d days.", 
                currentDailyAllowance, newDailyAllowance, remainingDays)
            : String.format("Postpone this purchase. Spending ₹%s will exceed your limit by ₹%s.", 
                itemCost, projectedRemaining.abs());
        return new AffordabilityVerdict(canAfford, fallbackAdvice);
    }
}