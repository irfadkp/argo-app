package com.ecommerce.recommendations.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.Random;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class LoadGeneratorService {
    
    private static final Logger logger = LoggerFactory.getLogger(LoadGeneratorService.class);
    
    @Autowired
    private RecommendationService recommendationService;
    
    private final Random random = new Random();
    private final AtomicLong requestCounter = new AtomicLong(0);
    
    // Run every 10 minutes (600000 milliseconds)
    @Scheduled(fixedRate = 600000, initialDelay = 60000)
    public void generateLoad() {
        long batchId = System.currentTimeMillis();
        logger.info("========================================");
        logger.info("LOAD GENERATOR: Starting batch {} - Generating synthetic traffic", batchId);
        logger.info("========================================");
        
        try {
            // Generate 50-100 requests per batch
            int requestCount = random.nextInt(50, 101);
            logger.info("LOAD GENERATOR: Will generate {} requests in this batch", requestCount);
            
            long startTime = System.currentTimeMillis();
            int successCount = 0;
            int errorCount = 0;
            
            for (int i = 0; i < requestCount; i++) {
                try {
                    generateSingleRequest();
                    successCount++;
                    
                    // Small delay between requests (10-50ms)
                    Thread.sleep(random.nextInt(10, 51));
                    
                } catch (Exception e) {
                    errorCount++;
                    logger.warn("LOAD GENERATOR: Request {} failed: {}", i + 1, e.getMessage());
                }
            }
            
            long duration = System.currentTimeMillis() - startTime;
            long totalRequests = requestCounter.addAndGet(requestCount);
            
            logger.info("========================================");
            logger.info("LOAD GENERATOR: Batch {} completed", batchId);
            logger.info("LOAD GENERATOR: Duration: {}ms", duration);
            logger.info("LOAD GENERATOR: Success: {}, Errors: {}", successCount, errorCount);
            logger.info("LOAD GENERATOR: Total requests generated: {}", totalRequests);
            logger.info("LOAD GENERATOR: Average request time: {}ms", duration / requestCount);
            logger.info("========================================");
            
        } catch (Exception e) {
            logger.error("LOAD GENERATOR: Batch {} failed: {}", batchId, e.getMessage(), e);
        }
    }
    
    private void generateSingleRequest() {
        int requestType = random.nextInt(100);
        
        if (requestType < 70) {
            // 70% - Get recommendations
            Long userId = random.nextLong(1, 101);
            int limit = random.nextInt(5, 16);
            
            logger.debug("LOAD GENERATOR: Fetching recommendations for user {}, limit {}", userId, limit);
            recommendationService.getRecommendations(userId, limit);
            
        } else if (requestType < 90) {
            // 20% - Refresh recommendations
            Long userId = random.nextLong(1, 101);
            
            logger.debug("LOAD GENERATOR: Refreshing recommendations for user {}", userId);
            recommendationService.refreshRecommendations(userId);
            
        } else {
            // 10% - Get stats
            logger.debug("LOAD GENERATOR: Fetching statistics");
            recommendationService.getStats();
        }
    }
    
    // Also run a continuous low-level load (every 30 seconds)
    @Scheduled(fixedRate = 30000, initialDelay = 30000)
    public void generateContinuousLoad() {
        try {
            // Generate 3-5 requests
            int requestCount = random.nextInt(3, 6);
            
            logger.debug("CONTINUOUS LOAD: Generating {} background requests", requestCount);
            
            for (int i = 0; i < requestCount; i++) {
                generateSingleRequest();
                Thread.sleep(random.nextInt(100, 501));
            }
            
            requestCounter.addAndGet(requestCount);
            
        } catch (Exception e) {
            logger.warn("CONTINUOUS LOAD: Error generating background load: {}", e.getMessage());
        }
    }
    
    // Log system status every 5 minutes
    @Scheduled(fixedRate = 300000, initialDelay = 120000)
    public void logSystemStatus() {
        logger.info("========================================");
        logger.info("SYSTEM STATUS: Recommendations Service Health Check");
        logger.info("========================================");
        
        try {
            var stats = recommendationService.getStats();
            
            logger.info("SYSTEM STATUS: Total users with recommendations: {}", stats.get("totalUsers"));
            logger.info("SYSTEM STATUS: Total recommendations: {}", stats.get("totalRecommendations"));
            logger.info("SYSTEM STATUS: Average recommendations per user: {}", stats.get("averageRecommendationsPerUser"));
            logger.info("SYSTEM STATUS: Total synthetic requests: {}", requestCounter.get());
            
            // Log memory usage
            Runtime runtime = Runtime.getRuntime();
            long totalMemory = runtime.totalMemory() / 1024 / 1024;
            long freeMemory = runtime.freeMemory() / 1024 / 1024;
            long usedMemory = totalMemory - freeMemory;
            
            logger.info("SYSTEM STATUS: Memory - Total: {}MB, Used: {}MB, Free: {}MB", 
                totalMemory, usedMemory, freeMemory);
            
            // Log thread count
            int threadCount = Thread.activeCount();
            logger.info("SYSTEM STATUS: Active threads: {}", threadCount);
            
            logger.info("========================================");
            
        } catch (Exception e) {
            logger.error("SYSTEM STATUS: Error logging system status: {}", e.getMessage(), e);
        }
    }
}

// Made with Bob
