# Comprehensive Logging Guide

This document describes the comprehensive logging implementation for both backend and frontend services in the e-commerce application.

## Overview

The application now includes extensive logging at all levels to provide visibility when deployed in Kubernetes. Logs are structured, contextual, and include relevant metadata for debugging and monitoring.

## Backend Logging

### Logger Implementation

The backend uses **Winston** for structured logging with the following features:

- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Structured JSON logs** for production
- **Colorized console output** for development
- **Automatic metadata** including service name, environment, hostname, and pod name
- **Request/Response logging** with duration tracking
- **Error tracking** with full stack traces

### Backend Logger Location

`backend/src/utils/logger.js`

### Key Features

#### 1. Request/Response Logging
Every HTTP request is logged with:
- Method, URL, path, query parameters
- IP address and user agent
- Request duration
- Response status code
- Content length

#### 2. Authentication Logging
- Login attempts (success/failure)
- Registration events
- Token validation
- Admin access attempts

#### 3. Business Event Logging
- User registration/login/logout
- Product CRUD operations
- Cart operations (add, update, remove, clear)
- Order creation and status updates

#### 4. Database Operations
- Connection status
- Query execution (in debug mode)
- Transaction commits/rollbacks

#### 5. Error Logging
- Unhandled exceptions
- Unhandled promise rejections
- API errors with full context
- Validation errors

#### 6. Periodic System Logs
- **Every 10 minutes**, a random system status log is generated
- Includes system metrics (uptime, memory, CPU)
- Helps verify logging is working in K8s

### Backend Log Examples

```json
{
  "timestamp": "2024-01-15 10:30:45.123",
  "level": "INFO",
  "message": "User logged in successfully",
  "service": "ecommerce-backend",
  "environment": "production",
  "hostname": "backend-pod-abc123",
  "pod": "backend-deployment-xyz",
  "userId": 42,
  "email": "user@example.com",
  "ip": "10.0.1.5"
}
```

### Backend Logging Points

1. **Server Startup**
   - Environment configuration
   - Database connection
   - Middleware initialization
   - Port binding

2. **Authentication** (`authController.js`)
   - Registration attempts
   - Login attempts (with success/failure)
   - Token validation
   - Logout events

3. **Products** (`productController.js`)
   - Product listing with filters
   - Product creation/update/deletion
   - Category queries
   - Stock updates

4. **Cart** (`cartController.js`)
   - Cart retrieval
   - Items added/updated/removed
   - Cart clearing
   - Stock validation

5. **Orders** (`orderController.js`)
   - Order creation with full transaction details
   - Order status updates
   - Order queries
   - Stock deduction tracking

6. **Middleware** (`auth.js`)
   - Authentication checks
   - Admin authorization
   - Token validation failures

## Frontend Logging

### Logger Implementation

The frontend uses a custom logger utility with:

- **Log Levels**: DEBUG, INFO, WARN, ERROR
- **Browser console output** (structured in production, pretty in development)
- **API request/response tracking**
- **User action logging**
- **Navigation tracking**
- **Performance metrics**
- **Error boundary integration**

### Frontend Logger Location

`frontend/src/utils/logger.js`

### Key Features

#### 1. API Request/Response Logging
- All API calls are logged with method, URL, and duration
- Request/response interceptors in axios
- Error details including status codes

#### 2. User Action Logging
- Button clicks
- Form submissions
- Navigation events
- Business actions (add to cart, checkout, etc.)

#### 3. Application Lifecycle
- App initialization
- Component mounting/unmounting
- Route changes
- Authentication state changes

#### 4. Performance Logging
- Page load time
- API response times
- Render times
- Resource loading

#### 5. Error Logging
- Unhandled errors
- Promise rejections
- API errors
- Component errors

### Frontend Log Examples

```javascript
// Development mode (pretty printed)
[2024-01-15T10:30:45.123Z] [INFO] User logged in successfully { userId: 42, email: 'user@example.com' }

// Production mode (structured JSON)
{"timestamp":"2024-01-15T10:30:45.123Z","level":"INFO","app":"ecommerce-frontend","environment":"production","message":"User logged in successfully","userId":42,"email":"user@example.com"}
```

### Frontend Logging Points

1. **Application** (`App.jsx`)
   - App startup with environment info
   - Performance metrics
   - Global error handlers
   - Route changes

2. **Authentication** (`AuthContext.jsx`)
   - Login/logout events
   - Registration
   - Token restoration
   - Session management

3. **Cart** (`CartContext.jsx`)
   - Cart operations
   - Item management
   - Cart synchronization

4. **API Service** (`services/api.js`)
   - All HTTP requests
   - Response times
   - Error responses
   - 401 handling

## Kubernetes Integration

### Viewing Logs in Kubernetes

```bash
# View backend logs
kubectl logs -f deployment/backend -n ecommerce-dev

# View frontend logs (from nginx)
kubectl logs -f deployment/frontend -n ecommerce-dev

# View logs from specific pod
kubectl logs -f <pod-name> -n ecommerce-dev

# View logs with timestamps
kubectl logs --timestamps=true deployment/backend -n ecommerce-dev

# Tail last 100 lines
kubectl logs --tail=100 deployment/backend -n ecommerce-dev

# View logs from all pods in deployment
kubectl logs -l app=backend -n ecommerce-dev --all-containers=true
```

### Log Aggregation

For production environments, consider using:

1. **ELK Stack** (Elasticsearch, Logstash, Kibana)
2. **Loki + Grafana**
3. **Datadog**
4. **CloudWatch** (AWS)
5. **Stackdriver** (GCP)

### Environment Variables

Backend logging can be configured via environment variables:

```yaml
env:
  - name: NODE_ENV
    value: "production"  # Controls log level
  - name: POD_NAME
    valueFrom:
      fieldRef:
        fieldPath: metadata.name
  - name: HOSTNAME
    valueFrom:
      fieldRef:
        fieldPath: spec.nodeName
```

## Log Levels

### Backend (Winston)

- **DEBUG**: Detailed information for debugging (disabled in production)
- **INFO**: General informational messages
- **WARN**: Warning messages (non-critical issues)
- **ERROR**: Error messages (critical issues)

### Frontend (Custom Logger)

- **DEBUG**: Detailed debugging information (disabled in production)
- **INFO**: General application flow
- **WARN**: Warnings and potential issues
- **ERROR**: Errors and exceptions

## Best Practices

1. **Structured Logging**: Always include relevant context
2. **Sensitive Data**: Never log passwords, tokens, or PII
3. **Log Levels**: Use appropriate levels for different scenarios
4. **Performance**: Avoid excessive logging in hot paths
5. **Correlation**: Include request IDs for tracing
6. **Metrics**: Log business metrics for analytics

## Monitoring Queries

### Common Log Queries

```bash
# Find all errors in last hour
kubectl logs --since=1h deployment/backend -n ecommerce-dev | grep ERROR

# Find specific user activity
kubectl logs deployment/backend -n ecommerce-dev | grep "userId: 42"

# Monitor order creation
kubectl logs -f deployment/backend -n ecommerce-dev | grep "ORDER_CREATED"

# Check authentication failures
kubectl logs deployment/backend -n ecommerce-dev | grep "Authentication failed"

# View periodic system logs (every 10 minutes)
kubectl logs deployment/backend -n ecommerce-dev | grep "Periodic system status"
```

## Troubleshooting

### No Logs Appearing

1. Check pod status: `kubectl get pods -n ecommerce-dev`
2. Check pod events: `kubectl describe pod <pod-name> -n ecommerce-dev`
3. Verify log level configuration
4. Check stdout/stderr redirection

### Too Many Logs

1. Increase log level (INFO instead of DEBUG)
2. Filter specific log types
3. Implement log sampling
4. Use log aggregation tools

### Missing Context

1. Ensure all logger calls include context objects
2. Check middleware is properly configured
3. Verify request ID propagation

## Performance Impact

- **Backend**: Minimal overhead (~1-2ms per request)
- **Frontend**: Negligible impact on user experience
- **Storage**: Plan for ~100MB-1GB logs per day per service

## Future Enhancements

1. **Distributed Tracing**: Add OpenTelemetry integration
2. **Log Sampling**: Implement sampling for high-volume endpoints
3. **Custom Metrics**: Export metrics to Prometheus
4. **Alert Integration**: Connect logs to alerting systems
5. **Log Rotation**: Implement log rotation for file-based logging

## Made with Bob