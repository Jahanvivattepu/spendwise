package com.spendwise.insights;

import com.fasterxml.jackson.databind.JsonNode;
import com.spendwise.dashboard.DashboardService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.time.YearMonth;
import java.util.List;
import java.util.Map;

/**
 * Sends AGGREGATED monthly figures (no email, no individual transactions) to an external
 * OpenAI-compatible chat-completions API. Failures are reported honestly; there is no fake fallback text.
 */
@Service
public class InsightsService {

    private static final Logger log = LoggerFactory.getLogger(InsightsService.class);

    private static final String SYSTEM_PROMPT =
            "You are a concise personal finance assistant. Use only the figures provided and never invent numbers. "
                    + "Reply in plain text. Do not give regulated investment advice.";

    private final DashboardService dashboard;
    private final String apiUrl;
    private final String model;
    private final String apiKey;
    private final RestClient restClient;

    public InsightsService(DashboardService dashboard,
                           @Value("${llm.api-url}") String apiUrl,
                           @Value("${llm.model}") String model,
                           @Value("${llm.api-key}") String apiKey) {
        this.dashboard = dashboard;
        this.apiUrl = apiUrl;
        this.model = model;
        this.apiKey = apiKey;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5_000);
        factory.setReadTimeout(30_000);
        this.restClient = RestClient.builder().requestFactory(factory).build();
    }

    public String generate(Long userId, YearMonth month) {
        if (apiUrl.isBlank() || model.isBlank() || apiKey.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "AI is not configured. Set LLM_API_URL, LLM_MODEL and LLM_API_KEY.");
        }

        String prompt = buildPrompt(dashboard.summarize(userId, month));
        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user", "content", prompt)));

        try {
            JsonNode response = restClient.post()
                    .uri(apiUrl)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            String text = response == null ? ""
                    : response.path("choices").path(0).path("message").path("content").asText("");
            if (text.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The AI service returned an empty response.");
            }
            return text.trim();
        } catch (RestClientResponseException e) {
            log.warn("LLM API returned HTTP {}", e.getStatusCode().value()); // never log the key or the body
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "The AI service returned an error (HTTP " + e.getStatusCode().value() + ").");
        } catch (RestClientException e) {
            log.warn("LLM API call failed: {}", e.getClass().getSimpleName());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not reach the AI service.");
        }
    }

    /** Pure function (no network): builds the prompt from aggregates only. */
    public static String buildPrompt(DashboardService.Summary s) {
        StringBuilder sb = new StringBuilder();
        sb.append("Monthly summary for ").append(s.month()).append(" (amounts in the user's own currency):\n");
        sb.append("- Income: ").append(s.income()).append('\n');
        sb.append("- Expenses: ").append(s.expenses()).append('\n');
        sb.append("- Balance: ").append(s.balance()).append('\n');
        if (s.monthlyBudget() == null) {
            sb.append("- Monthly budget: No budget set\n");
        } else {
            sb.append("- Monthly budget: ").append(s.monthlyBudget())
                    .append(" (").append(s.budgetUsedPercent()).append("% used, remaining ")
                    .append(s.budgetRemaining()).append(")\n");
        }
        sb.append("- Spending by category:\n");
        if (s.spendingByCategory().isEmpty()) {
            sb.append("  (no expenses recorded)\n");
        } else {
            s.spendingByCategory().forEach(c ->
                    sb.append("  - ").append(c.category()).append(": ").append(c.total()).append('\n'));
        }
        sb.append("\nGive 3 brief, practical observations or suggestions based only on these figures.");
        return sb.toString();
    }
}
