# Pino Logger Usage Guide

This guide demonstrates how to use the enhanced Pino-based structured logging infrastructure.

## Overview

The Pino logger provides structured, high-performance logging with:
- JSON-formatted logs for easy parsing
- Configurable log levels (debug, info, warn, error)
- Pretty printing in development
- Specialized functions for different log types
- Child loggers for contextual logging

## Basic Usage

### Import the Logger

```typescript
import {
  logAPIRequest,
  logAIRequest,
  logError,
  logInfo,
  logWarn,
  logDebug,
  createChildLogger,
} from "@/lib/logger";
```

### Log API Requests

Use `logAPIRequest` to log HTTP requests with performance metrics:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { logAPIRequest } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = "req-123"; // From middleware
  
  try {
    // Your API logic here
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

### Log AI Requests

Use `logAIRequest` to track AI service usage and token consumption:

```typescript
import { logAIRequest } from "@/lib/logger";

async function summarizeText(text: string) {
  const startTime = Date.now();
  
  const result = await aiService.summarize(text);
  
  const duration = Date.now() - startTime;
  logAIRequest(
    "summary",
    result.inputTokens,
    result.outputTokens,
    result.cached,
    duration,
    "gpt-4",
    { requestId: "req-123" }
  );
  
  return result;
}
```

### Log Errors

Use `logError` to log errors with stack traces and context:

```typescript
import { logError } from "@/lib/logger";

try {
  await riskyOperation();
} catch (error) {
  logError(
    error as Error,
    {
      operation: "riskyOperation",
      userId: "user-123",
      input: sanitizedInput,
    },
    "req-456"
  );
  throw error;
}
```

### General Logging

Use the basic logging functions for general messages:

```typescript
import { logInfo, logWarn, logDebug } from "@/lib/logger";

// Info level
logInfo("User preferences updated", { userId: "123", changes: ["theme"] });

// Warning level
logWarn("Cache approaching capacity", { current: 950, max: 1000 });

// Debug level
logDebug("Processing step completed", { step: 3, duration: 45 });
```

## Advanced Usage

### Child Loggers

Create child loggers to add consistent context to all logs in a scope:

```typescript
import { createChildLogger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const logger = createChildLogger({
    endpoint: "/api/v1/ai/summarize",
    requestId: "req-789",
    userId: "user-123",
  });
  
  logger.info({ message: "Starting summarization" });
  
  try {
    const result = await summarize(text);
    logger.info({ message: "Summarization complete", tokens: result.tokens });
    return NextResponse.json(result);
  } catch (error) {
    logger.error({ message: "Summarization failed", error });
    throw error;
  }
}
```

### Specialized Logging Functions

#### Cache Access Logging

```typescript
import { logCacheAccess } from "@/lib/logger";

const cached = await cache.get(cacheKey);
logCacheAccess(cacheKey, cached !== null, { requestId: "req-123" });
```

#### Rate Limit Logging

```typescript
import { logRateLimit } from "@/lib/logger";

const { allowed, count, limit } = await checkRateLimit(userId);
logRateLimit(userId, !allowed, count, limit, { endpoint: "/api/v1/ai/summarize" });
```

#### Database Operation Logging

```typescript
import { logDatabaseOperation } from "@/lib/logger";

const startTime = Date.now();
const result = await db.query("SELECT * FROM users WHERE id = ?", [userId]);
const duration = Date.now() - startTime;

logDatabaseOperation("query", "users", duration, { rowsReturned: result.length });
```

#### Analytics Event Logging

```typescript
import { logAnalyticsEvent } from "@/lib/logger";

logAnalyticsEvent("note_saved", userId, sessionId, {
  noteLength: note.length,
  timestamp: new Date().toISOString(),
});
```

#### Authentication Event Logging

```typescript
import { logAuthEvent } from "@/lib/logger";

// Successful login
logAuthEvent("login", userId, true, { method: "password" });

// Failed login
logAuthEvent("login", undefined, false, {
  reason: "invalid_credentials",
  ip: clientIP,
});
```

## Integration with Middleware

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

## Configuration

The logger respects the `LOG_LEVEL` environment variable:

```bash
# Development (verbose)
LOG_LEVEL=debug

# Production (less verbose)
LOG_LEVEL=info

# Only warnings and errors
LOG_LEVEL=warn

# Only errors
LOG_LEVEL=error
```

## Log Output

### Development Mode

In development, logs are pretty-printed with colors:

```
[14:23:45 UTC] INFO: Starting summarization
    endpoint: "/api/v1/ai/summarize"
    requestId: "req-789"
    userId: "user-123"
```

### Production Mode

In production, logs are JSON-formatted for easy parsing:

```json
{
  "level": 30,
  "time": "2024-04-29T14:23:45.123Z",
  "env": "production",
  "message": "Starting summarization",
  "endpoint": "/api/v1/ai/summarize",
  "requestId": "req-789",
  "userId": "user-123"
}
```

## Best Practices

1. **Always include request IDs** for correlation across logs
2. **Use structured data** instead of string interpolation
3. **Log at appropriate levels**:
   - `debug`: Detailed diagnostic information
   - `info`: General informational messages
   - `warn`: Warning messages for potentially harmful situations
   - `error`: Error messages for failures
4. **Include context** in error logs (user ID, operation, input)
5. **Use child loggers** for consistent context in a scope
6. **Don't log sensitive data** (passwords, API keys, tokens)
7. **Log performance metrics** (duration, token usage, cache hits)

## Migration from Old Logger

If you're migrating from the old console-based logger:

### Before (Old Logger)

```typescript
import { logRequest } from "@/lib/middleware/logging";

logRequest("info", "API request completed", {
  method: "GET",
  path: "/api/test",
  status: 200,
  duration: 150,
});
```

### After (Pino Logger)

```typescript
import { logAPIRequest } from "@/lib/logger";

logAPIRequest("GET", "/api/test", 200, 150, "req-123");
```

## Requirements Implemented

- **Requirement 1.6**: Log all requests and errors for debugging and monitoring
- **Requirement 20.2**: Log all errors with stack traces and context information
- **Requirement 20.3**: Implement structured logging with consistent log levels
- **Requirement 20.4**: Track AI service response times and token usage
- **Requirement 20.8**: Track cache hit rates for performance optimization
