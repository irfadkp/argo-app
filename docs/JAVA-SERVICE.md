# Java Recommendations Service - Complete Guide

## Overview

The Java Recommendations Service is a Spring Boot microservice that generates massive amounts of logs for APM visibility. It includes automatic load generators that create synthetic traffic every 10 minutes, plus continuous background load.

## 🎯 Key Features

### Automatic Log Generation
- **Periodic Load**: 50-100 requests every 10 minutes
- **Continuous Load**: 3-5 requests every 30 seconds  
- **System Status**: Health metrics every 5 minutes
- **Comprehensive Logging**: Structured JSON logs with full context

### Technology Stack
- **Spring Boot 3.2** with Java 21
- **Instana APM** for distributed tracing
- **PostgreSQL** for data persistence
- **Logback** with structured JSON logging
- **Prometheus** metrics export
- **Docker** containerization

## 🚀 Quick Start

### 1. Build and Deploy

```bash
# Commit and push to trigger CI/CD
git add java-service/
git commit -m "feat: add Java recommendations service with load generators"
git push origin main

# GitHub Actions will:
# - Build Docker image
# - Push to ghcr.io/YOUR_USERNAME/argo-app/java-service:v1.0.14
# - Create release
```

### 2. Deploy to Kubernetes

```bash
# ArgoCD will auto-sync, or force sync:
argocd app sync ecommerce-dev

# Or manual deployment:
kubectl apply -k gitops/overlays/dev/

# Watch deployment
kubectl get pods -n ecommerce-dev -w
```

### 3. Verify Deployment

```bash
# Check pods
kubectl get pods -n ecommerce-dev -l app=java-service

# Expected output:
# NAME                            READY   STATUS    RESTARTS   AGE
# java-service-xxx                1/1     Running   0          2m
# java-service-yyy                1/1     Running   0          2m

# View logs
kubectl logs -f deployment/java-service -n ecommerce-dev
```

## 📊 Load Generation Details

### Periodic Load Generator (Every 10 minutes)

Generates 50-100 requests per batch with detailed logging:

```
========================================
LOAD GENERATOR: Starting batch 1705318245123 - Generating synthetic traffic
========================================
LOAD GENERATOR: Will generate 75 requests in this batch
LOAD GENERATOR: Batch 1705318245123 completed
LOAD GENERATOR: Duration: 4523ms
LOAD GENERATOR: Success: 75, Errors: 0
LOAD GENERATOR: Total requests generated: 1250
LOAD GENERATOR: Average request time: 60ms
========================================
```

**Request Distribution:**
- 70% - Get recommendations for random users
- 20% - Refresh recommendations
- 10% - Get statistics

### Continuous Background Load (Every 30 seconds)

Generates 3-5 requests to maintain baseline activity:

```
CONTINUOUS LOAD: Generating 4 background requests
```

### System Status Logging (Every 5 minutes)

Logs comprehensive health metrics:

```
========================================
SYSTEM STATUS: Recommendations Service Health Check
========================================
SYSTEM STATUS: Total users with recommendations: 45
SYSTEM STATUS: Total recommendations: 387
SYSTEM STATUS: Average recommendations per user: 8.6
SYSTEM STATUS: Total synthetic requests: 1250
SYSTEM STATUS: Memory - Total: 512MB, Used: 234MB, Free: 278MB
SYSTEM STATUS: Active threads: 23
========================================
```

## 📝 Log Examples

### Structured JSON Logs (Production)

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "service": "recommendations-service",
  "environment": "production",
  "logger": "com.ecommerce.recommendations.service.LoadGeneratorService",
  "message": "LOAD GENERATOR: Starting batch 1705318245123",
  "thread": "scheduling-1"
}
```

### Request Logs

```json
{
  "timestamp": "2024-01-15T10:30:45.456Z",
  "level": "INFO",
  "service": "recommendations-service",
  "logger": "com.ecommerce.recommendations.controller.RecommendationController",
  "message": "Received request to get recommendations: userId=42, limit=10",
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "endpoint": "GET /api/recommendations/user/{userId}",
  "userId": 42
}
```

## 🔧 Configuration

### Environment Variables

All configuration is done via environment variables (set in Kubernetes ConfigMap/Secret):

```yaml
# Database
DATABASE_HOST: postgres
DATABASE_PORT: 5432
DATABASE_NAME: ecommerce
DATABASE_USER: postgres
DATABASE_PASSWORD: password

# Instana APM
INSTANA_ENABLED: true
INSTANA_AGENT_HOST: instana-agent.instana-agent
INSTANA_AGENT_PORT: 42699
INSTANA_SERVICE_NAME: recommendations-service
```

### Adjusting Load Generation

To modify load generation frequency, edit `LoadGeneratorService.java`:

```java
// Change from 10 minutes (600000ms) to 5 minutes (300000ms)
@Scheduled(fixedRate = 300000, initialDelay = 60000)
public void generateLoad() {
    // ...
}

// Change request count
int requestCount = random.nextInt(100, 201); // 100-200 requests
```

## 🌐 API Endpoints

### Get Recommendations
```bash
curl http://localhost:8080/api/recommendations/user/1?limit=10
```

Response:
```json
{
  "success": true,
  "userId": 1,
  "count": 10,
  "recommendations": [
    {
      "id": 12345,
      "userId": 1,
      "productId": 42,
      "productName": "Wireless Headphones",
      "score": 0.95,
      "reason": "Based on your browsing history",
      "createdAt": "2024-01-15T10:30:45"
    }
  ],
  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### Get Statistics
```bash
curl http://localhost:8080/api/recommendations/stats
```

Response:
```json
{
  "totalUsers": 45,
  "totalRecommendations": 387,
  "averageRecommendationsPerUser": 8.6,
  "timestamp": "2024-01-15T10:30:45",
  "requestId": "b2c3d4e5-f6g7-8901-bcde-f12345678901"
}
```

### Health Check
```bash
curl http://localhost:8080/actuator/health
```

Response:
```json
{
  "status": "UP",
  "components": {
    "db": {
      "status": "UP",
      "details": {
        "database": "PostgreSQL",
        "validationQuery": "isValid()"
      }
    },
    "diskSpace": {
      "status": "UP"
    },
    "ping": {
      "status": "UP"
    }
  }
}
```

## 📈 Monitoring with Instana

Once deployed with Instana agent, you'll see:

### Service Map
- Java service appears in application topology
- Shows connections to PostgreSQL
- Displays request flow from load generators

### Traces
- Every synthetic request is traced
- Full distributed tracing context
- Request duration and status

### Metrics
- JVM metrics (heap, threads, GC)
- Request rates and latencies
- Error rates
- Custom business metrics

### Logs
- Correlated with traces
- Searchable and filterable
- Full context with MDC

## 🔍 Viewing Logs in Kubernetes

### Real-time Logs
```bash
# Follow logs from all pods
kubectl logs -f deployment/java-service -n ecommerce-dev

# Follow logs from specific pod
kubectl logs -f java-service-xxx -n ecommerce-dev

# View last 100 lines
kubectl logs --tail=100 deployment/java-service -n ecommerce-dev
```

### Filter Logs
```bash
# Show only load generator logs
kubectl logs deployment/java-service -n ecommerce-dev | grep "LOAD GENERATOR"

# Show only system status
kubectl logs deployment/java-service -n ecommerce-dev | grep "SYSTEM STATUS"

# Show errors
kubectl logs deployment/java-service -n ecommerce-dev | grep ERROR
```

### Log Aggregation
For production, use log aggregation tools:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Loki + Grafana**
- **Datadog**
- **Splunk**

## 🐛 Troubleshooting

### Service Won't Start

```bash
# Check pod status
kubectl describe pod -l app=java-service -n ecommerce-dev

# Common issues:
# 1. Image pull error - Check image exists in GHCR
# 2. Database connection - Verify postgres is running
# 3. Resource limits - Check memory/CPU limits
```

### No Logs Appearing

```bash
# Verify pod is running
kubectl get pods -n ecommerce-dev -l app=java-service

# Check pod events
kubectl get events -n ecommerce-dev --sort-by='.lastTimestamp'

# Exec into pod
kubectl exec -it deployment/java-service -n ecommerce-dev -- /bin/sh
```

### Database Connection Issues

```bash
# Test database connectivity
kubectl exec -it deployment/java-service -n ecommerce-dev -- \
  wget -O- postgres:5432

# Check database pod
kubectl get pods -n ecommerce-dev -l app=postgres

# View database logs
kubectl logs statefulset/postgres -n ecommerce-dev
```

### Load Generator Not Running

```bash
# Check logs for scheduler
kubectl logs deployment/java-service -n ecommerce-dev | grep "scheduling"

# Verify @EnableScheduling is present
# Check application startup logs
kubectl logs deployment/java-service -n ecommerce-dev | grep "Started RecommendationsApplication"
```

## 🔄 CI/CD Pipeline

### Automatic Build

When you push changes to `java-service/`:

1. **GitHub Actions** detects changes
2. **Maven** builds the application
3. **Docker** builds the image
4. **Image** pushed to `ghcr.io/YOUR_USERNAME/argo-app/java-service:v1.0.14`
5. **Release** created on GitHub

### Manual Deployment

Update image tag in `gitops/overlays/dev/kustomization.yaml`:

```yaml
images:
  - name: ecommerce-java-service
    newName: ghcr.io/YOUR_USERNAME/argo-app/java-service
    newTag: "v1.0.14"
```

Then commit and push:
```bash
git add gitops/overlays/dev/kustomization.yaml
git commit -m "deploy: update java-service to v1.0.14"
git push origin main
```

ArgoCD will auto-sync within 3 minutes.

## 📊 Expected Log Volume

With default configuration:

- **Periodic Load**: 50-100 requests every 10 minutes = ~6-12 requests/minute
- **Continuous Load**: 3-5 requests every 30 seconds = ~6-10 requests/minute
- **Total**: ~12-22 requests/minute
- **Daily Logs**: ~17,000-32,000 requests/day
- **Log Size**: ~50-100MB/day (structured JSON)

## 🎯 Performance Metrics

- **Startup Time**: 30-60 seconds
- **Memory Usage**: 200-400MB (512MB request, 1GB limit)
- **CPU Usage**: 0.1-0.3 cores (250m request, 1 core limit)
- **Request Latency**: 10-50ms average
- **Throughput**: 100+ requests/second capable

## 🔐 Security

- **Non-root user**: Runs as user `spring` (UID 1001)
- **Read-only filesystem**: Application is immutable
- **Secret management**: Database credentials in Kubernetes Secret
- **Network policies**: Can be restricted to internal traffic only

## 📚 Additional Resources

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [Instana Java Agent](https://www.instana.com/docs/ecosystem/java/)
- [Logback Configuration](https://logback.qos.ch/manual/configuration.html)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)

## 🤝 Contributing

To add new features:

1. Create new controller/service classes
2. Add comprehensive logging
3. Update tests
4. Build and test locally
5. Push to trigger CI/CD

## Made with Bob 🤖