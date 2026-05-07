package com.ecommerce.recommendations.service;

import com.ecommerce.recommendations.model.Recommendation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class RecommendationService {
    
    private static final Logger logger = LoggerFactory.getLogger(RecommendationService.class);
    
    // In-memory storage for demo (would be database in production)
    private final Map<Long, List<Recommendation>> userRecommendations = new ConcurrentHashMap<>();
    private final Random random = new Random();
    
    // Sample product data
    private static final String[] PRODUCT_NAMES = {
        "Wireless Headphones", "Smart Watch", "Laptop Stand", "USB-C Hub",
        "Mechanical Keyboard", "Gaming Mouse", "Monitor", "Webcam",
        "Desk Lamp", "Phone Case", "Portable Charger", "Bluetooth Speaker"
    };
    
    private static final String[] REASONS = {
        "Based on your browsing history",
        "Frequently bought together",
        "Trending in your area",
        "Similar to items you viewed",
        "Popular in Electronics",
        "Recommended for you"
    };
    
    public List<Recommendation> getRecommendations(Long userId, int limit) {
        long startTime = System.currentTimeMillis();
        MDC.put("userId", String.valueOf(userId));
        MDC.put("operation", "getRecommendations");
        
        try {
            logger.info("Fetching recommendations for user: {}, limit: {}", userId, limit);
            
            // Generate recommendations if not exists
            if (!userRecommendations.containsKey(userId)) {
                logger.debug("No cached recommendations found, generating new ones");
                generateRecommendations(userId);
            }
            
            List<Recommendation> recommendations = userRecommendations.get(userId)
                .stream()
                .limit(limit)
                .collect(Collectors.toList());
            
            long duration = System.currentTimeMillis() - startTime;
            logger.info("Successfully fetched {} recommendations for user {} in {}ms", 
                recommendations.size(), userId, duration);
            
            // Log detailed recommendation info
            recommendations.forEach(rec -> 
                logger.debug("Recommendation: productId={}, productName={}, score={}, reason={}", 
                    rec.getProductId(), rec.getProductName(), rec.getScore(), rec.getReason())
            );
            
            return recommendations;
            
        } catch (Exception e) {
            logger.error("Error fetching recommendations for user {}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Failed to fetch recommendations", e);
        } finally {
            MDC.clear();
        }
    }
    
    public Recommendation createRecommendation(Long userId, Long productId, String productName, Double score, String reason) {
        long startTime = System.currentTimeMillis();
        MDC.put("userId", String.valueOf(userId));
        MDC.put("productId", String.valueOf(productId));
        MDC.put("operation", "createRecommendation");
        
        try {
            logger.info("Creating recommendation: userId={}, productId={}, productName={}, score={}", 
                userId, productId, productName, score);
            
            Recommendation recommendation = new Recommendation();
            recommendation.setId(random.nextLong(1000, 999999));
            recommendation.setUserId(userId);
            recommendation.setProductId(productId);
            recommendation.setProductName(productName);
            recommendation.setScore(score);
            recommendation.setReason(reason);
            recommendation.setCreatedAt(LocalDateTime.now());
            
            userRecommendations.computeIfAbsent(userId, k -> new ArrayList<>()).add(recommendation);
            
            long duration = System.currentTimeMillis() - startTime;
            logger.info("Successfully created recommendation with id {} in {}ms", recommendation.getId(), duration);
            
            return recommendation;
            
        } catch (Exception e) {
            logger.error("Error creating recommendation: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to create recommendation", e);
        } finally {
            MDC.clear();
        }
    }
    
    public void refreshRecommendations(Long userId) {
        long startTime = System.currentTimeMillis();
        MDC.put("userId", String.valueOf(userId));
        MDC.put("operation", "refreshRecommendations");
        
        try {
            logger.info("Refreshing recommendations for user: {}", userId);
            
            userRecommendations.remove(userId);
            generateRecommendations(userId);
            
            long duration = System.currentTimeMillis() - startTime;
            logger.info("Successfully refreshed recommendations for user {} in {}ms", userId, duration);
            
        } catch (Exception e) {
            logger.error("Error refreshing recommendations for user {}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Failed to refresh recommendations", e);
        } finally {
            MDC.clear();
        }
    }
    
    private void generateRecommendations(Long userId) {
        logger.debug("Generating new recommendations for user: {}", userId);
        
        List<Recommendation> recommendations = new ArrayList<>();
        int count = random.nextInt(5, 12);
        
        for (int i = 0; i < count; i++) {
            Recommendation rec = new Recommendation();
            rec.setId(random.nextLong(1000, 999999));
            rec.setUserId(userId);
            rec.setProductId(random.nextLong(1, 100));
            rec.setProductName(PRODUCT_NAMES[random.nextInt(PRODUCT_NAMES.length)]);
            rec.setScore(random.nextDouble(0.5, 1.0));
            rec.setReason(REASONS[random.nextInt(REASONS.length)]);
            rec.setCreatedAt(LocalDateTime.now());
            
            recommendations.add(rec);
        }
        
        // Sort by score descending
        recommendations.sort((a, b) -> Double.compare(b.getScore(), a.getScore()));
        
        userRecommendations.put(userId, recommendations);
        logger.debug("Generated {} recommendations for user {}", count, userId);
    }
    
    public Map<String, Object> getStats() {
        logger.info("Fetching recommendation statistics");
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalUsers", userRecommendations.size());
        stats.put("totalRecommendations", userRecommendations.values().stream()
            .mapToInt(List::size)
            .sum());
        stats.put("averageRecommendationsPerUser", userRecommendations.isEmpty() ? 0 :
            userRecommendations.values().stream()
                .mapToInt(List::size)
                .average()
                .orElse(0.0));
        stats.put("timestamp", LocalDateTime.now());
        
        logger.info("Statistics: {}", stats);
        return stats;
    }
}

// Made with Bob
