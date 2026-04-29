# Health Check Endpoint

## Overview

The health check endpoint provides real-time status information about the application and its dependencies. This endpoint is used for monitoring, deployment verification, and operational health checks.

**Endpoint:** `GET /api/v1/health`

**Implements:** Requirement 20.5 - Health check endpoint with service status checks

## Response Format

```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;  // ISO 8601 format
  services: {
    api: "up" | "down";
    database: "up" | "down" | "not_configured";
    aiService: "up" | "down" | "not_configured";
    cache: "up" | "down" | "not_configured";
  };
  version: string;
}
```

## Status Codes

- **200 OK**: System is healthy or degraded (still operational)
- **503 Service Unavailable**: System is unhealthy (critical services down)

## Status Levels

### Healthy
All configured services are operational. The system is fully functional.

### Degraded
One service is down, but the system can still operate with reduced functionality.

### Unhealthy
Two or more services are down. The system may not be fully operational.

## Service Checks

### API
Always returns "up" if the endpoint is reachable.

### Database
- **up**: Database is configured and connection is successful
- **down**: Database is configured but connection failed
- **not_configured**: Storage mode is set to localStorage (no database required)

### AI Service
- **up**: AI provider and API key are configured
- **down**: AI service configuration is invalid or service is unreachable
- **not_configured**: No AI provider configured

### Cache
- **up**: Cache is enabled and operational
- **down**: Cache is enabled but not functioning
- **not_configured**: Cache is disabled

## Example Responses

### Healthy System (localStorage mode)

```bash
curl http://localhost:3000/api/v1/health
```

```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "api": "up",
    "database": "not_configured",
    "aiService": "up",
    "cache": "up"
  },
  "version": "1.0.0"
}
```

### Degraded System (database down)

```json
{
  "status": "degraded",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "api": "up",
    "database": "down",
    "aiService": "up",
    "cache": "up"
  },
  "version": "1.0.0"
}
```

### Unhealthy System (multiple services down)

```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "api": "up",
    "database": "down",
    "aiService": "down",
    "cache": "not_configured"
  },
  "version": "1.0.0"
}
```

## Monitoring Integration

### Kubernetes Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3
```

### Kubernetes Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /api/v1/health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  successThreshold: 1
  failureThreshold: 3
```

### Uptime Monitoring

Configure your monitoring service (e.g., UptimeRobot, Pingdom) to:
- Check the endpoint every 1-5 minutes
- Alert when status code is 503
- Alert when response time exceeds threshold
- Alert when status field is "unhealthy"

### Log Monitoring

The health check endpoint logs all service checks:

```typescript
// Successful checks
{
  "level": "info",
  "message": "AI service health check passed",
  "service": "aiService",
  "provider": "openai"
}

// Failed checks
{
  "level": "error",
  "message": "Database health check failed",
  "service": "database",
  "error": "Connection timeout"
}
```

## Implementation Details

### Service Check Logic

1. **API**: Always returns "up" (if endpoint is reachable)
2. **Database**: Checks if `STORAGE_MODE=database` and validates database URL
3. **AI Service**: Checks if AI provider and API key are configured
4. **Cache**: Checks if cache is enabled in configuration

### Performance

- Response time: < 100ms (no actual connectivity tests)
- No external API calls (to avoid costs and latency)
- Configuration-based checks only

### Security

- No sensitive information exposed in responses
- API keys and secrets are never included
- Version information is safe to expose

## Testing

### Manual Testing

```bash
# Test with curl
curl -i http://localhost:3000/api/v1/health

# Test with httpie
http GET http://localhost:3000/api/v1/health

# Test with Node.js script
npx tsx scripts/test-health-check.ts
```

### Automated Testing

```bash
# Run unit tests (when Jest is configured)
npm test -- app/api/v1/health/__tests__/route.test.ts
```

## Troubleshooting

### Status is "degraded" or "unhealthy"

1. Check the `services` object to identify which service is down
2. Review application logs for error details
3. Verify environment configuration
4. Check service connectivity

### Database shows "down"

- Verify `DATABASE_URL` is set correctly
- Check database server is running
- Verify network connectivity
- Check database credentials

### AI Service shows "down"

- Verify `AI_PROVIDER` is set to "openai" or "anthropic"
- Verify `AI_API_KEY` is set and valid
- Check AI service status page

### Cache shows "down"

- Verify `CACHE_ENABLED=true` in configuration
- Check application logs for cache errors
- Restart the application

## Related Documentation

- [Configuration Guide](../../../lib/config/README.md)
- [Logging Guide](../../../lib/LOGGER_README.md)
- [API Documentation](../README.md)
