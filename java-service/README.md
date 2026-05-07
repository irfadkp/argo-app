# Recommendations Service (Java Spring Boot)

Product recommendations microservice with comprehensive logging and Instana APM integration.

## Features

- **Spring Boot 3.2** with Java 21
- **Comprehensive Logging** with Logback and structured JSON output
- **Instana APM Integration** for distributed tracing
- **Automatic Load Generation** - Generates 50-100 requests every 10 minutes
- **Continuous Background Load** - 3-5 requests every 30 seconds
- **System Status Logging** - Health metrics every 5 minutes
- **PostgreSQL Integration** for data persistence
- **Actuator Endpoints** for health checks and metrics
- **Prometheus Metrics** export

## Load Generator

The service includes an automatic load generator that creates synthetic traffic:

### Periodic Load (Every 10 minutes)
- Generates 50-100 requests per batch
- Mix of operations:
  - 70% - Get recommendations
  - 20% - Refresh recommendations
  - 10% - Get statistics
- Comprehensive logging for each batch

### Continuous Load (Every 30 seconds)
- Generates 3-5 background requests
- Maintains baseline activity

### System Status (Every 5 minutes)
- Logs service health metrics
- Memory usage statistics
- Thread count
- Recommendation statistics

## API Endpoints

### Get Recommendations
```http
GET /api/recommendations/user/{userId}?limit=10
```

Returns personalized product recommendations for a user.

### Get Statistics
```http
GET /api/recommendations/stats
```

Returns service statistics including total users, recommendations, and averages.

### Health Check
```http
GET /api/recommendations/health
GET /actuator/health
```

Returns service health status.

## Building

### Local Development
```bash
# Build with Maven
mvn clean package

# Run locally
java -jar target/recommendations-service-1.0.14.jar

# Or use Maven
mvn spring-boot:run
```

### Docker Build
```bash
# Build image
docker build -t recommendations-service:v1.0.14 .

# Run container
docker run -p 8080:8080 \
  -e DATABASE_HOST=localhost \
  -e DATABASE_PORT=5432 \
  -e DATABASE_NAME=ecommerce \
  -e DATABASE_USER=postgres \
  -e DATABASE_PASSWORD=password \
  recommendations-service:v1.0.14
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8080 |
| `DATABASE_HOST` | PostgreSQL host | localhost |
| `DATABASE_PORT` | PostgreSQL port | 5432 |
| `DATABASE_NAME` | Database name | ecommerce |
| `DATABASE_USER` | Database user | postgres |
| `DATABASE_PASSWORD` | Database password | password |
| `INSTANA_ENABLED` | Enable Instana APM | true |
| `INSTANA_AGENT_HOST` | Instana agent host | localhost |
| `INSTANA_AGENT_PORT` | Instana agent port | 42699 |
| `INSTANA_SERVICE_NAME` | Service name in Instana | recommendations-service |

## Logging

The service uses structured JSON logging in production:

```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "INFO",
  "service": "recommendations-service",
  "environment": "production",
  "logger": "com.ecommerce.recommendations.service.LoadGeneratorService",
  "message": "LOAD GENERATOR: Starting batch 1705318245123 - Generating synthetic traffic",
  "thread": "scheduling-1"
}
```

### Log Levels

- **INFO**: General application flow, load generator activity, system status
- **DEBUG**: Detailed request/response information
- **WARN**: Non-critical issues
- **ERROR**: Critical errors with stack traces

### Key Log Messages

- `LOAD GENERATOR:` - Synthetic load generation activity
- `SYSTEM STATUS:` - Periodic health and metrics
- `CONTINUOUS LOAD:` - Background request activity
- Request/response logs with duration and status

## Kubernetes Deployment

The service is deployed via GitOps with ArgoCD:

```bash
# Deploy to Kubernetes
kubectl apply -k gitops/overlays/dev/

# Check pods
kubectl get pods -n ecommerce-dev -l app=java-service

# View logs
kubectl logs -f deployment/java-service -n ecommerce-dev

# Port forward
kubectl port-forward svc/java-service 8080:8080 -n ecommerce-dev
```

## Monitoring with Instana

Once deployed with Instana agent:

1. **Service Map**: View java-service in the application topology
2. **Traces**: See distributed traces for all requests
3. **Metrics**: Monitor JVM metrics, memory, threads
4. **Logs**: Correlated logs with traces
5. **Load Patterns**: Observe synthetic load generation

## Development

### Project Structure
```
java-service/
├── src/
│   ├── main/
│   │   ├── java/com/ecommerce/recommendations/
│   │   │   ├── RecommendationsApplication.java
│   │   │   ├── controller/
│   │   │   │   └── RecommendationController.java
│   │   │   ├── service/
│   │   │   │   ├── RecommendationService.java
│   │   │   │   └── LoadGeneratorService.java
│   │   │   └── model/
│   │   │       └── Recommendation.java
│   │   └── resources/
│   │       ├── application.yml
│   │       └── logback-spring.xml
│   └── test/
├── pom.xml
├── Dockerfile
└── README.md
```

### Adding New Features

1. Create new controller/service classes
2. Add logging with SLF4J
3. Use MDC for request context
4. Update tests
5. Build and test locally
6. Push to trigger CI/CD

## Testing

```bash
# Run tests
mvn test

# Run with coverage
mvn test jacoco:report

# Integration tests
mvn verify
```

## Performance

- **Startup Time**: ~30-60 seconds
- **Memory**: 512Mi request, 1Gi limit
- **CPU**: 250m request, 1000m limit
- **Load Generation**: 50-100 requests per 10 minutes
- **Background Load**: 3-5 requests per 30 seconds

## Troubleshooting

### Service Won't Start
```bash
# Check logs
kubectl logs deployment/java-service -n ecommerce-dev

# Check events
kubectl describe pod -l app=java-service -n ecommerce-dev
```

### Database Connection Issues
```bash
# Verify database is running
kubectl get pods -n ecommerce-dev -l app=postgres

# Check connection from pod
kubectl exec -it deployment/java-service -n ecommerce-dev -- \
  curl postgres:5432
```

### No Logs Appearing
```bash
# Check log level
kubectl get configmap java-service-config -n ecommerce-dev -o yaml

# Force log output
kubectl logs -f deployment/java-service -n ecommerce-dev --tail=100
```

## Made with Bob 🤖