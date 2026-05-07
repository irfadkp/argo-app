package com.ecommerce.recommendations;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class RecommendationsApplication {
    
    private static final Logger logger = LoggerFactory.getLogger(RecommendationsApplication.class);
    
    public static void main(String[] args) {
        logger.info("Starting Recommendations Service...");
        logger.info("Java Version: {}", System.getProperty("java.version"));
        logger.info("Spring Boot Application starting with Instana APM integration");
        
        SpringApplication.run(RecommendationsApplication.class, args);
        
        logger.info("Recommendations Service started successfully");
        logger.info("Service is ready to accept requests");
    }
}

// Made with Bob
