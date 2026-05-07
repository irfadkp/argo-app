package com.ecommerce.recommendations.controller;

import com.ecommerce.recommendations.model.Recommendation;
import com.ecommerce.recommendations.service.RecommendationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/recommendations")
@CrossOrigin(origins = "*")
public class RecommendationController {
    
    private static final Logger logger = LoggerFactory.getLogger(RecommendationController.class);
    
    @Autowired
    private RecommendationService recommendationService;
    
    @GetMapping("/user/{userId}")
    public ResponseEntity<Map<String, Object>> getRecommendations(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "10") int limit) {
        
        String requestId = UUID.randomUUID().toString();
        MDC.put("requestId", requestId);
        MDC.put("endpoint", "GET /api/recommendations/user/{userId}");
        
        long startTime = System.currentTimeMillis();
        
        try {
            logger.info("Received request to get recommendations: userId={}, limit={}", userId, limit);
            
            List<Recommendation> recommendations = recommendationService.getRecommendations(userId, limit);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("userId", userId);
            response.put("count", recommendations.size());
            response.put("recommendations", recommendations);
            response.put("requestId", requestId);
            
            long duration = System.currentTimeMillis() - startTime;
            logger.info("Request completed successfully in {}ms: userId={}, count={}", 
                duration, userId, recommendations.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            logger.error("Request failed after {}ms: userId={}, error={}", duration, userId, e.getMessage(), e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            errorResponse.put("requestId", requestId);
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        } finally {
            MDC.clear();
        }
    }
    
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        String requestId = UUID.randomUUID().toString();
        MDC.put("requestId", requestId);
        MDC.put("endpoint", "GET /api/recommendations/stats");
        
        long startTime = System.currentTimeMillis();
        
        try {
            logger.info("Received request to get statistics");
            
            Map<String, Object> stats = recommendationService.getStats();
            stats.put("requestId", requestId);
            
            long duration = System.currentTimeMillis() - startTime;
            logger.info("Statistics retrieved successfully in {}ms", duration);
            
            return ResponseEntity.ok(stats);
            
        } catch (Exception e) {
            long duration = System.currentTimeMillis() - startTime;
            logger.error("Failed to get statistics after {}ms: error={}", duration, e.getMessage(), e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", e.getMessage());
            errorResponse.put("requestId", requestId);
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        } finally {
            MDC.clear();
        }
    }
    
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "recommendations");
        return ResponseEntity.ok(response);
    }
}

// Made with Bob
