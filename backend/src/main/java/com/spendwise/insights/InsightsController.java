package com.spendwise.insights;

import com.spendwise.dashboard.DashboardService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/insights")
public class InsightsController {

    private final InsightsService service;

    public InsightsController(InsightsService service) {
        this.service = service;
    }

    @PostMapping
    public Map<String, String> generate(@AuthenticationPrincipal Long userId,
                                        @RequestParam(required = false) String month) {
        return Map.of("insight", service.generate(userId, DashboardService.parseMonth(month)));
    }
}
