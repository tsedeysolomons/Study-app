# API Middleware

This directory contains middleware implementations for the Smart AI Study Assistant API routes.

## Overview

The middleware system provides three core functionalities:
- **CORS**: Cross-Origin Resource Sharing with configurable allowed origins
- **Timeout**: Request timeout handling to prevent hanging connections
- **Logging**: Structured request/response logging for debugging and monitoring

## Requirements Implemented

- **Requirement 1.3**: CORS policies to allow requests from the frontend domain
- **Requirement 1.6**: Log all requests and errors for debugging and monitoring
- **Requirement 1.7**: Request timeout handling to prevent hanging connections

## Usage

### Quick Start - Combined Middleware

The easiest way to use all middleware together:

```typescript
import { NextRequest } from "next/server";
import { withMiddleware } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  return withMiddleware(request, async () => {
    // Your route handler logic
    const data = await fetchData();
    return NextResponse.json({ success: true, data });
  });
}
```

### Custom Options

Configure specific middleware behavior:

```typescript
export async function POST(request: NextRequest) {
  return withMiddleware(
    request,
    async () => {
      // Your route handler logic
      return NextResponse.json({ success: true });
    },
    {
      // Custom CORS options
      cors: {
        allowedOrigins: ["https://example.com", "https://app.example.com"],
        allowedMethods: ["GET", "POST"],
        credentials: true,
      },
      // Custom timeout
      timeout: {
        timeoutMs: 15000, // 15 seconds
        onTimeout: (req) => console.log("Request timed out:", req.url),
      },
      // Enable/disable logging
      logging: true,
    }
  );
}
```

### Disable Specific Middleware

```typescript
export async function GET(request: NextRequest) {
  return withMiddleware(
    request,
    async () => {
      return NextResponse.json({ success: true });
    },
    {
      cors: false,      // Disable CORS
      timeout: false,   // Disable timeout
      logging: true,    // Keep logging enabled
    }
  );
}
```

### Individual Middleware

Use middleware components separately:

#### CORS Only

```typescript
import { withCORS } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  return withCORS(
    request,
    async () => {
      return NextResponse.json({ data: "..." });
    },
    {
      allowedOrigins: ["https://example.com"],
      allowedMethods: ["GET", "POST"],
    }
  );
}
```

#### Timeout Only

```typescript
import { withTimeout } from "@/lib/middleware";

export async function POST(request: NextRequest) {
  return withTimeout(
    request,
    async () => {
      const result = await longRunningOperation();
      return NextResponse.json({ result });
    },
    {
      timeoutMs: 10000, // 10 seconds
    }
  );
}
```

#### Logging Only

```typescript
import { withLogging } from "@/lib/middleware";

export async function GET(request: NextRequest) {
  return withLogging(request, async (requestId) => {
    // requestId is available for correlation
    console.log("Processing request:", requestId);
    return NextResponse.json({ data: "..." });
  });
}
```

## CORS Middleware

### Features

- Configurable allowed origins (wildcard or specific domains)
- Automatic preflight (OPTIONS) request handling
- Customizable allowed methods and headers
- Credentials support
- Preflight cache control

### Configuration

CORS is configured via environment variables:

```env
ALLOWED_ORIGINS=https://example.com,https://app.example.com
# Or use wildcard for development
ALLOWED_ORIGINS=*
```

### Options

```typescript
interface CORSOptions {
  allowedOrigins?: string | string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}
```

### Example

```typescript
import { withCORS } from "@/lib/middleware";

export async function POST(request: NextRequest) {
  return withCORS(
    request,
    async () => {
      return NextResponse.json({ success: true });
    },
    {
      allowedOrigins: ["https://example.com"],
      allowedMethods: ["POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
      exposedHeaders: ["X-Request-ID"],
      credentials: true,
      maxAge: 3600,
    }
  );
}
```

## Timeout Middleware

### Features

- Configurable timeout duration
- Automatic timeout error responses
- Timeout callback for custom handling
- AbortController integration
- Promise timeout utilities

### Configuration

Default timeout is 30 seconds. Configure per-route or globally.

### Options

```typescript
interface TimeoutOptions {
  timeoutMs?: number;
  onTimeout?: (request: NextRequest) => void;
}
```

### Example

```typescript
import { withTimeout } from "@/lib/middleware";

export async function POST(request: NextRequest) {
  return withTimeout(
    request,
    async () => {
      const result = await aiService.generateSummary(text);
      return NextResponse.json({ result });
    },
    {
      timeoutMs: 15000, // 15 seconds for AI requests
      onTimeout: (req) => {
        console.error("AI request timed out:", req.url);
        // Could send alert, increment metric, etc.
      },
    }
  );
}
```

### Utilities

#### AbortController with Timeout

```typescript
import { createTimeoutSignal } from "@/lib/middleware";

const { signal, cleanup } = createTimeoutSignal(5000);
try {
  const response = await fetch(url, { signal });
  return response;
} finally {
  cleanup();
}
```

#### Promise Timeout

```typescript
import { withPromiseTimeout } from "@/lib/middleware";

const result = await withPromiseTimeout(
  longRunningPromise,
  10000,
  "Operation timed out"
);
```

## Logging Middleware

### Features

- Structured JSON logging
- Request/response correlation via request ID
- Configurable log levels
- Client IP extraction
- Error logging with stack traces
- Logger class for contextual logging

### Configuration

Configure log level via environment variables:

```env
LOG_LEVEL=info  # debug | info | warn | error
```

### Log Levels

- **debug**: Detailed debugging information
- **info**: General informational messages (default)
- **warn**: Warning messages
- **error**: Error messages

### Example

```typescript
import { withLogging } from "@/lib/middleware";

export async function POST(request: NextRequest) {
  return withLogging(request, async (requestId) => {
    console.log("Processing request:", requestId);
    
    const result = await processData();
    
    return NextResponse.json({ 
      success: true, 
      requestId // Include in response for client-side correlation
    });
  });
}
```

### Logger Class

For more structured logging:

```typescript
import { createLogger } from "@/lib/middleware";

export async function POST(request: NextRequest) {
  const logger = createLogger({ 
    endpoint: "/api/v1/ai/summarize",
    userId: "123" 
  });

  logger.info("Starting summarization");
  
  try {
    const result = await summarize(text);
    logger.info("Summarization complete", { 
      inputLength: text.length,
      outputLength: result.length 
    });
    return NextResponse.json({ result });
  } catch (error) {
    logger.error("Summarization failed", error);
    throw error;
  }
}
```

### Child Loggers

Create child loggers with additional context:

```typescript
const logger = createLogger({ userId: "123" });
const requestLogger = logger.child({ requestId: "abc-123" });

requestLogger.info("Processing request"); // Includes both userId and requestId
```

## Response Headers

The middleware adds the following headers to responses:

### CORS Headers
- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Methods`
- `Access-Control-Allow-Headers`
- `Access-Control-Allow-Credentials`
- `Access-Control-Max-Age`
- `Access-Control-Expose-Headers` (if configured)

### Logging Headers
- `X-Request-ID`: Unique identifier for request correlation

## Error Handling

All middleware integrates with the application's error handling system:

```typescript
import { withMiddleware } from "@/lib/middleware";
import { APIError, ErrorCodes } from "@/lib/errors";

export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    // Errors are automatically caught and formatted
    if (!isValid(data)) {
      throw new APIError(ErrorCodes.INVALID_INPUT, "Invalid data");
    }
    
    return NextResponse.json({ success: true });
  });
}
```

Timeout errors return:
```json
{
  "success": false,
  "error": {
    "code": "TIMEOUT",
    "message": "Request timed out",
    "details": {
      "timeoutMs": 30000,
      "url": "/api/v1/endpoint",
      "method": "POST"
    }
  }
}
```

## Testing

All middleware components have comprehensive test coverage. Run tests:

```bash
npm test lib/middleware
```

## Best Practices

1. **Always use combined middleware** for consistency unless you have specific reasons to use individual middleware

2. **Configure timeouts appropriately**:
   - Short timeouts (5-10s) for simple operations
   - Medium timeouts (15-30s) for AI requests
   - Long timeouts (60s+) for batch operations

3. **Use specific CORS origins in production**:
   ```typescript
   cors: {
     allowedOrigins: process.env.NODE_ENV === "production" 
       ? ["https://app.example.com"]
       : "*"
   }
   ```

4. **Include request IDs in responses** for client-side error tracking:
   ```typescript
   return withLogging(request, async (requestId) => {
     return NextResponse.json({ 
       success: true, 
       data,
       requestId 
     });
   });
   ```

5. **Use structured logging** with the Logger class for better observability

6. **Handle timeout callbacks** for critical operations:
   ```typescript
   timeout: {
     timeoutMs: 15000,
     onTimeout: (req) => {
       // Send alert, increment metric, etc.
       alerting.sendAlert("AI request timeout", { url: req.url });
     }
   }
   ```

## Examples

See the test files for comprehensive usage examples:
- `__tests__/cors.test.ts`
- `__tests__/timeout.test.ts`
- `__tests__/logging.test.ts`
- `__tests__/index.test.ts`
