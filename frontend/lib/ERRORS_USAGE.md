# Error Handling Infrastructure Usage Guide

This guide demonstrates how to use the error handling infrastructure in the Smart AI Study Assistant.

## Overview

The error handling infrastructure provides:

1. **APIError class** - Structured error handling with error codes
2. **Error codes** - Standardized error identification
3. **HTTP status mapping** - Automatic status code assignment
4. **Retry logic** - Exponential backoff for transient failures
5. **Error formatting** - User-friendly error messages

## Basic Usage

### Creating API Errors

```typescript
import { APIError, ErrorCodes } from '@/lib/errors';

// Simple error
throw new APIError(ErrorCodes.INVALID_INPUT, 'Text cannot be empty');

// Error with details
throw new APIError(
  ErrorCodes.RATE_LIMIT_EXCEEDED,
  'Too many requests',
  { retryAfter: 60 }
);

// Error with custom details
throw new APIError(
  ErrorCodes.TOKEN_LIMIT_EXCEEDED,
  'Input exceeds token limit',
  { maxTokens: 4000, actualTokens: 5200 }
);
```

### Using in API Routes

```typescript
// app/api/v1/ai/summarize/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { APIError, ErrorCodes, handleAPIError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    if (!body.text || body.text.trim().length === 0) {
      throw new APIError(
        ErrorCodes.INVALID_INPUT,
        'Text is required'
      );
    }
    
    // Check token limit
    const tokenCount = estimateTokens(body.text);
    if (tokenCount > 4000) {
      throw new APIError(
        ErrorCodes.TOKEN_LIMIT_EXCEEDED,
        'Text exceeds maximum token limit',
        { maxTokens: 4000, actualTokens: tokenCount }
      );
    }
    
    // Process request
    const result = await aiService.summarize(body.text);
    
    return NextResponse.json({
      success: true,
      data: result,
    });
    
  } catch (error) {
    // Handle error with middleware
    const errorResponse = handleAPIError(error);
    return NextResponse.json(errorResponse, { status: errorResponse.status });
  }
}
```

### Using Retry Logic

```typescript
import { withRetry, fetchWithRetry } from '@/lib/retry-handler';
import { APIError, ErrorCodes } from '@/lib/errors';

// Basic retry with defaults (1 retry, exponential backoff)
const result = await withRetry(async () => {
  return await aiService.summarize(text);
});

// Custom retry configuration
const result = await withRetry(
  async () => await aiService.generateQuiz(text),
  {
    maxRetries: 2,
    backoff: 'exponential',
    initialDelay: 500,
    maxDelay: 5000,
    onRetry: (attempt, error, delay) => {
      console.log(`Retry attempt ${attempt} after ${delay}ms`);
    }
  }
);

// Fetch with retry
const response = await fetchWithRetry('/api/v1/ai/summarize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Some text' })
}, {
  maxRetries: 2,
  initialDelay: 1000
});

// Fetch JSON with retry
const data = await fetchJSONWithRetry('/api/v1/analytics/summary', {
  method: 'GET'
});
```

### Creating Reusable Retry Wrappers

```typescript
import { createRetryWrapper } from '@/lib/retry-handler';

// Create a wrapper for AI service calls
const summarizeWithRetry = createRetryWrapper(
  (text: string) => aiService.summarize(text),
  { maxRetries: 2, initialDelay: 500 }
);

// Use the wrapper
const result = await summarizeWithRetry('Some text to summarize');
```

### Frontend Error Handling

```typescript
// In a React component
import { formatErrorForDisplay } from '@/lib/errors';
import { useToast } from '@/hooks/use-toast';

function MyComponent() {
  const { toast } = useToast();
  
  const handleSummarize = async () => {
    try {
      const response = await fetch('/api/v1/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: noteText })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        // Format error for display
        const { title, description } = formatErrorForDisplay(data);
        toast({
          title,
          description,
          variant: 'destructive'
        });
        return;
      }
      
      // Handle success
      setSummary(data.data.summary);
      
    } catch (error) {
      const { title, description } = formatErrorForDisplay(error);
      toast({
        title,
        description,
        variant: 'destructive'
      });
    }
  };
  
  return (
    <button onClick={handleSummarize}>
      Summarize
    </button>
  );
}
```

### Custom Error Handling Hook

```typescript
// hooks/use-error-handler.ts
import { useToast } from '@/hooks/use-toast';
import { formatErrorForDisplay } from '@/lib/errors';

export function useErrorHandler() {
  const { toast } = useToast();
  
  const handleError = (error: any, context?: string) => {
    console.error(`Error in ${context}:`, error);
    
    const { title, description } = formatErrorForDisplay(error);
    
    toast({
      title,
      description,
      variant: 'destructive'
    });
  };
  
  return { handleError };
}

// Usage in component
function MyComponent() {
  const { handleError } = useErrorHandler();
  
  const handleAction = async () => {
    try {
      await someAsyncOperation();
    } catch (error) {
      handleError(error, 'MyComponent.handleAction');
    }
  };
}
```

## Error Categorization

### Temporary Errors (Retryable)

These errors are transient and can be retried:

- `AI_TIMEOUT` - AI service timeout
- `TIMEOUT` - General timeout
- `SERVICE_UNAVAILABLE` - Service temporarily down
- `AI_SERVICE_ERROR` - AI service error
- `STORAGE_ERROR` - Storage error
- `DATABASE_ERROR` - Database error
- `CACHE_ERROR` - Cache error

### Permanent Errors (Non-Retryable)

These errors require user action and should not be retried:

- `INVALID_INPUT` - Invalid input data
- `MISSING_REQUIRED_FIELD` - Required field missing
- `INVALID_FORMAT` - Invalid data format
- `TOKEN_LIMIT_EXCEEDED` - Token limit exceeded
- `UNAUTHORIZED` - Not authenticated
- `INVALID_TOKEN` - Invalid auth token
- `TOKEN_EXPIRED` - Auth token expired
- `FORBIDDEN` - Access forbidden
- `NOT_FOUND` - Resource not found
- `INVALID_AI_RESPONSE` - Malformed AI response

## Advanced Usage

### Custom Retry Logic

```typescript
import { withRetry } from '@/lib/retry-handler';

// Custom shouldRetry function
const result = await withRetry(
  async () => await riskyOperation(),
  {
    maxRetries: 3,
    shouldRetry: (error) => {
      // Only retry on specific error codes
      return error.code === 'TEMPORARY_ERROR';
    }
  }
);
```

### Detailed Retry Information

```typescript
import { withRetryDetailed } from '@/lib/retry-handler';

const result = await withRetryDetailed(
  async () => await aiService.summarize(text),
  { maxRetries: 2 }
);

console.log(`Success after ${result.attempts} attempts`);
console.log(`Total time: ${result.totalTime}ms`);
console.log(`Result:`, result.value);
```

### Error Tracking

```typescript
import { handleAPIError } from '@/lib/errors';

try {
  // API logic
} catch (error) {
  const errorResponse = handleAPIError(error);
  
  // Log to monitoring service
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: {
        errorCode: errorResponse.error.code,
        statusCode: errorResponse.status
      }
    });
  }
  
  return NextResponse.json(errorResponse, { status: errorResponse.status });
}
```

## Best Practices

1. **Always use APIError for known errors** - This ensures consistent error handling
2. **Include helpful details** - Add context that helps debugging
3. **Use appropriate error codes** - Choose the most specific error code
4. **Retry transient failures** - Use retry logic for network and service errors
5. **Don't retry user errors** - Invalid input should not be retried
6. **Log errors properly** - Include context and stack traces
7. **Format errors for users** - Use formatErrorForDisplay for UI messages
8. **Handle rate limits gracefully** - Show retry-after time to users

## Testing

See `__tests__/README.md` for information on running tests.

## Requirements Validation

This error handling infrastructure validates the following requirements:

- **Requirement 1.5**: Backend API error handling with structured responses
- **Requirement 15.1**: Cached responses when AI service unavailable
- **Requirement 15.2**: User-friendly error messages
- **Requirement 15.3**: Retry logic with exponential backoff
- **Requirement 15.6**: Error categorization (temporary vs permanent)
