# Pino Logging Infrastructure

## Overview

This directory contains the enhanced logging infrastructure using Pino for structured, high-performance logging. This implementation replaces the basic console-based logging with a production-ready solution.

## What Was Implemented

### Task 1.5: Set up logging infrastructure

✅ **Completed**: Enhanced logging infrastructure with Pino

#### Files Created

1. **`frontend/lib/logger.ts`** (370 lines)
   - Pino logger initialization with environment-specific configuration
   - Structured logging functions for different log types
   - Child logger support for contextual logging
   - Specialized logging functions for:
     - API requests (with performance metrics)
     - AI requests (with token tracking)
     - Errors (with stack traces)
     - Cache access (for performance monitoring)
     - Rate limits
     - Database operations
     - Analytics events
     - Authentication events

2. **`frontend/lib/__tests__/logger.test.ts`** (450 lines)
   - Comprehensive unit tests for all logging functions
   - Tests for logger initialization and configuration
   - Tests for child logger functionality
   - Tests for all specialized logging functions

3. **`frontend/lib/LOGGER_USAGE.md`**
   - Comprehensive usage guide with examples
   - Migration guide from old logger
   - Best practices and recommendations

4. **`frontend/lib/__examples__/logger-example.ts`**
   - Practical examples of logger usage in API routes
   - Demonstrates integration with middleware
   - Shows child logger patterns

## Requirements Implemented

### Requirement 1.6: Log all requests and errors
✅ Implemented `logAPIRequest()` function that logs:
- HTTP method, path, status code
- Request duration for performance monitoring
- Request ID for correlation
- Additional metadata

### Requirement 20.2: Log errors with stack traces and context
✅ Implemented `logError()` function that logs:
- Error message and stack trace
- Error name and type
- Contextual information
- Request ID for correlation

### Requirement 20.3: Structured logging with consistent log levels
✅ Implemented structured logging with:
- Configurable log levels (debug, info, warn, error)
- JSON-formatted logs in production
- Pretty-printed logs in development
- Consistent log structure across all functions

### Requirement 20.4: Track AI service response times and token usage
✅ Implemented `logAIRequest()` function that tracks:
- Request type (summary, quiz)
- Input and output token counts
- Total token usage
- Cache hit/miss status
- Request duration
- AI model used

### Requirement 20.8: Track cache hit rates
✅ Implemented `logCacheAccess()` function that tracks:
- Cache key
- Hit or miss status
- Additional metadata for analysis

## Key Features

### 1. Environment-Specific Configuration

**Development Mode:**
- Pretty-printed, colorized logs
- Human-readable timestamps
- Verbose output for debugging

**Production Mode:**
- JSON-formatted logs for parsing
- ISO timestamps
- Optimized for log aggregation services

### 2. Structured Logging

All logs are structured with consistent fields:
```json
{
  "level": 30,
  "time": "2024-04-29T14:23:45.123Z",
  "env": "production",
  "type": "api_request",
  "method": "GET",
  "path": "/api/v1/notes",
  "status": 200,
  "duration": 150,
  "requestId": "req-123"
}
```

### 3. Child Loggers

Create child loggers with consistent context:
```typescript
const logger = createChildLogger({
  endpoint: "/api/v1/ai/summarize",
  requestId: "req-789",
  userId: "user-123",
});

logger.info({ message: "Processing request" });
// All logs from this logger include endpoint, requestId, and userId
```

### 4. Specialized Logging Functions

- `logAPIRequest()` - HTTP request logging
- `logAIRequest()` - AI service usage tracking
- `logError()` - Error logging with stack traces
- `logCacheAccess()` - Cache performance monitoring
- `logRateLimit()` - Rate limit tracking
- `logDatabaseOperation()` - Database query logging
- `logAnalyticsEvent()` - Analytics event tracking
- `logAuthEvent()` - Authentication event logging

### 5. Performance Monitoring

Built-in support for tracking:
- Request duration
- Token usage
- Cache hit rates
- Database query performance

## Configuration

The logger respects the `LOG_LEVEL` environment variable:

```bash
# .env.local or .env.production
LOG_LEVEL=debug  # Development: verbose logging
LOG_LEVEL=info   # Production: standard logging
LOG_LEVEL=warn   # Only warnings and errors
LOG_LEVEL=error  # Only errors
```

## Usage Examples

### Basic API Request Logging

```typescript
import { logAPIRequest } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = "req-123";
  
  try {
    const data = await fetchData();
    const duration = Date.now() - startTime;
    
    logAPIRequest("GET", "/api/v1/notes", 200, duration, requestId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    const duration = Date.now() - startTime;
    logAPIRequest("GET", "/api/v1/notes", 500, duration, requestId);
    throw error;
  }
}
```

### AI Request Logging

```typescript
import { logAIRequest } from "@/lib/logger";

const result = await aiService.summarize(text);

logAIRequest(
  "summary",
  result.inputTokens,
  result.outputTokens,
  result.cached,
  duration,
  "gpt-4"
);
```

### Error Logging

```typescript
import { logError } from "@/lib/logger";

try {
  await riskyOperation();
} catch (error) {
  logError(
    error as Error,
    { operation: "riskyOperation", userId: "user-123" },
    "req-456"
  );
  throw error;
}
```

## Integration with Existing Middleware

The Pino logger works seamlessly with the existing logging middleware:

```typescript
import { withLogging } from "@/lib/middleware";
import { logInfo, logError } from "@/lib/logger";

export async function POST(request: NextRequest) {
  return withLogging(request, async (requestId) => {
    logInfo("Processing request", { requestId });
    
    try {
      const result = await processRequest(request);
      return NextResponse.json({ success: true, result });
    } catch (error) {
      logError(error as Error, { requestId });
      throw error;
    }
  });
}
```

## Testing

Comprehensive unit tests are provided in `frontend/lib/__tests__/logger.test.ts`:

- Logger initialization and configuration
- All logging functions
- Child logger functionality
- Metadata handling
- Error handling

## Dependencies

- **pino**: High-performance JSON logger
- **pino-pretty**: Pretty-printing for development

## Migration from Old Logger

The new Pino logger can coexist with the existing middleware logger. For new code, prefer the Pino logger for its better performance and features.

### Before (Middleware Logger)
```typescript
import { logRequest } from "@/lib/middleware/logging";
logRequest("info", "API request", { method: "GET", path: "/api/test" });
```

### After (Pino Logger)
```typescript
import { logAPIRequest } from "@/lib/logger";
logAPIRequest("GET", "/api/test", 200, 150, "req-123");
```

## Best Practices

1. **Always include request IDs** for log correlation
2. **Use structured data** instead of string interpolation
3. **Log at appropriate levels** (debug, info, warn, error)
4. **Include context** in error logs
5. **Use child loggers** for consistent context
6. **Don't log sensitive data** (passwords, API keys)
7. **Log performance metrics** (duration, tokens, cache hits)

## Future Enhancements

Potential improvements for future iterations:

1. Integration with log aggregation services (Datadog, Splunk)
2. Automatic error tracking with Sentry
3. Log sampling for high-traffic endpoints
4. Custom log formatters for specific use cases
5. Log rotation and archival strategies

## References

- [Pino Documentation](https://getpino.io/)
- [Pino Best Practices](https://getpino.io/#/docs/best-practices)
- [Structured Logging Guide](https://www.structlog.org/en/stable/)
