# Token Manager Usage Guide

The `TokenManager` class provides token usage tracking and budget enforcement for AI service requests. It helps control costs by validating requests against token limits and tracking daily usage with budget warnings.

## Features

- **Token Limit Validation**: Validates requests against configured input token limits
- **Daily Budget Tracking**: Tracks cumulative daily token usage (input + output)
- **Budget Warnings**: Automatic warnings when approaching or exceeding budget limits
- **Multi-Day Tracking**: Independent tracking for multiple dates
- **Flexible Configuration**: Configurable token limits and warning thresholds

## Installation

```typescript
import { TokenManager, TokenManagerConfig } from "@/lib/ai";
```

## Basic Usage

### Creating a Token Manager

```typescript
const config: TokenManagerConfig = {
  maxInputTokens: 4000,
  maxOutputTokens: {
    summary: 500,
    quiz: 1000,
  },
  dailyBudget: 10000,
  warningThreshold: 0.8, // 80% of budget
};

const tokenManager = new TokenManager(config);
```

### Validating Requests

```typescript
try {
  // Validate before making AI request
  tokenManager.validateRequest(inputText, "summary");
  
  // Make AI request...
  const result = await aiService.summarize(inputText);
  
  // Track usage after successful request
  tokenManager.trackUsage(
    result.metadata.inputTokens,
    result.metadata.outputTokens
  );
} catch (error) {
  if (error.code === "TOKEN_LIMIT_EXCEEDED") {
    console.error("Token limit exceeded:", error.message);
  }
}
```

## Configuration Options

### TokenManagerConfig

```typescript
interface TokenManagerConfig {
  /** Maximum input tokens allowed per request */
  maxInputTokens: number;
  
  /** Maximum output tokens by request type */
  maxOutputTokens: {
    summary: number;
    quiz: number;
  };
  
  /** Optional daily token budget (total input + output) */
  dailyBudget?: number;
  
  /** Warning threshold as percentage of daily budget (0-1, default: 0.8) */
  warningThreshold?: number;
}
```

### Example Configurations

**Development (Generous Limits)**
```typescript
const devConfig: TokenManagerConfig = {
  maxInputTokens: 8000,
  maxOutputTokens: {
    summary: 1000,
    quiz: 2000,
  },
  dailyBudget: 50000,
  warningThreshold: 0.9,
};
```

**Production (Cost-Conscious)**
```typescript
const prodConfig: TokenManagerConfig = {
  maxInputTokens: 4000,
  maxOutputTokens: {
    summary: 500,
    quiz: 1000,
  },
  dailyBudget: 10000,
  warningThreshold: 0.8,
};
```

**No Budget Limits**
```typescript
const noBudgetConfig: TokenManagerConfig = {
  maxInputTokens: 4000,
  maxOutputTokens: {
    summary: 500,
    quiz: 1000,
  },
  // No dailyBudget - unlimited daily usage
};
```

## API Reference

### validateRequest(text, type, date?)

Validates a request against token limits and daily budget.

```typescript
tokenManager.validateRequest(text, "summary");
tokenManager.validateRequest(text, "quiz", "2024-01-15");
```

**Parameters:**
- `text` (string): Input text to validate
- `type` ("summary" | "quiz"): Request type
- `date` (string, optional): Date to check budget for (defaults to today)

**Throws:**
- `APIError` with code `TOKEN_LIMIT_EXCEEDED` if limits are exceeded

### trackUsage(inputTokens, outputTokens, date?)

Tracks token usage for a request.

```typescript
tokenManager.trackUsage(1000, 500);
tokenManager.trackUsage(1000, 500, "2024-01-15");
```

**Parameters:**
- `inputTokens` (number): Number of input tokens consumed
- `outputTokens` (number): Number of output tokens generated
- `date` (string, optional): Date to track usage for (defaults to today)

### getDailyUsage(date?)

Gets daily usage statistics.

```typescript
const usage = tokenManager.getDailyUsage();
const usage15 = tokenManager.getDailyUsage("2024-01-15");

console.log(usage.totalTokens);    // Total tokens used
console.log(usage.inputTokens);    // Input tokens used
console.log(usage.outputTokens);   // Output tokens used
console.log(usage.requestCount);   // Number of requests
```

**Returns:** `DailyUsage` object

### getBudgetStatus(date?)

Gets budget status information.

```typescript
const status = tokenManager.getBudgetStatus();

if (status.warningExceeded) {
  console.warn(`Using ${Math.round(status.percentageUsed * 100)}% of budget`);
}

if (status.limitExceeded) {
  console.error("Daily budget exceeded!");
}

console.log(`Remaining: ${status.remaining} tokens`);
```

**Returns:** `BudgetStatus` object

### estimateTokens(text)

Estimates token count from text (4 characters ≈ 1 token).

```typescript
const estimated = tokenManager.estimateTokens(inputText);
console.log(`Estimated tokens: ${estimated}`);
```

### resetDailyUsage(date?)

Resets daily usage for a specific date.

```typescript
tokenManager.resetDailyUsage("2024-01-15");
```

### clearAllUsage()

Clears all usage history.

```typescript
tokenManager.clearAllUsage();
```

### getTrackedDates()

Gets all dates with tracked usage.

```typescript
const dates = tokenManager.getTrackedDates();
console.log(dates); // ["2024-01-15", "2024-01-16", "2024-01-17"]
```

### updateConfig(config)

Updates configuration.

```typescript
tokenManager.updateConfig({
  dailyBudget: 15000,
  warningThreshold: 0.85,
});
```

## Integration Examples

### With AI Service Adapter

```typescript
import { AIServiceAdapter, TokenManager } from "@/lib/ai";

class AIService {
  private adapter: AIServiceAdapter;
  private tokenManager: TokenManager;

  constructor(adapter: AIServiceAdapter, tokenManager: TokenManager) {
    this.adapter = adapter;
    this.tokenManager = tokenManager;
  }

  async summarize(text: string) {
    // Validate before request
    this.tokenManager.validateRequest(text, "summary");

    // Make request
    const result = await this.adapter.summarize(text);

    // Track usage
    this.tokenManager.trackUsage(
      result.metadata.inputTokens,
      result.metadata.outputTokens
    );

    return result;
  }

  async generateQuiz(text: string) {
    // Validate before request
    this.tokenManager.validateRequest(text, "quiz");

    // Make request
    const result = await this.adapter.generateQuiz(text);

    // Track usage
    this.tokenManager.trackUsage(
      result.metadata.inputTokens,
      result.metadata.outputTokens
    );

    return result;
  }

  getBudgetStatus() {
    return this.tokenManager.getBudgetStatus();
  }
}
```

### With Budget Monitoring

```typescript
function checkBudgetStatus(tokenManager: TokenManager) {
  const status = tokenManager.getBudgetStatus();

  if (status.limitExceeded) {
    return {
      allowed: false,
      message: "Daily token budget exceeded. Please try again tomorrow.",
    };
  }

  if (status.warningExceeded) {
    return {
      allowed: true,
      message: `Warning: ${Math.round(status.percentageUsed! * 100)}% of daily budget used.`,
    };
  }

  return {
    allowed: true,
    message: `${status.remaining} tokens remaining today.`,
  };
}
```

### With API Route

```typescript
// app/api/v1/ai/summarize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { TokenManager } from "@/lib/ai";

const tokenManager = new TokenManager({
  maxInputTokens: 4000,
  maxOutputTokens: { summary: 500, quiz: 1000 },
  dailyBudget: 10000,
});

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    // Validate token limits
    tokenManager.validateRequest(text, "summary");

    // Make AI request
    const result = await aiService.summarize(text);

    // Track usage
    tokenManager.trackUsage(
      result.metadata.inputTokens,
      result.metadata.outputTokens
    );

    // Include budget status in response
    const budgetStatus = tokenManager.getBudgetStatus();

    return NextResponse.json({
      success: true,
      data: result,
      budget: {
        used: budgetStatus.usage.totalTokens,
        limit: budgetStatus.budget,
        remaining: budgetStatus.remaining,
      },
    });
  } catch (error) {
    if (error.code === "TOKEN_LIMIT_EXCEEDED") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: 429 }
      );
    }

    throw error;
  }
}
```

## Budget Warnings

The TokenManager automatically logs warnings to the console when budget thresholds are reached:

**Approaching Budget (80% by default)**
```
[TokenManager] Approaching daily token budget: 8100/10000 tokens (81%)
```

**Budget Exceeded**
```
[TokenManager] Daily token budget exceeded: 11000/10000 tokens (110%)
```

You can customize the warning threshold:

```typescript
const tokenManager = new TokenManager({
  maxInputTokens: 4000,
  maxOutputTokens: { summary: 500, quiz: 1000 },
  dailyBudget: 10000,
  warningThreshold: 0.9, // Warn at 90% instead of 80%
});
```

## Best Practices

1. **Always Validate Before Requests**: Call `validateRequest()` before making AI requests to prevent exceeding limits.

2. **Track Usage After Success**: Only call `trackUsage()` after successful AI requests to avoid counting failed attempts.

3. **Monitor Budget Status**: Regularly check `getBudgetStatus()` to inform users about remaining budget.

4. **Set Appropriate Limits**: Configure limits based on your cost constraints and expected usage patterns.

5. **Handle Errors Gracefully**: Catch `TOKEN_LIMIT_EXCEEDED` errors and provide clear feedback to users.

6. **Reset Daily**: Daily usage automatically resets by date, but you can manually reset if needed.

7. **Test with Different Scenarios**: Test with various text lengths and request types to ensure limits work as expected.

## Error Handling

```typescript
try {
  tokenManager.validateRequest(text, "summary");
} catch (error) {
  if (error.code === "TOKEN_LIMIT_EXCEEDED") {
    // Handle token limit error
    if (error.message.includes("daily token budget")) {
      // Daily budget exceeded
      showError("Daily token budget exceeded. Please try again tomorrow.");
    } else {
      // Input token limit exceeded
      showError("Text is too long. Please shorten your input.");
    }
  }
}
```

## Related Documentation

- [AI Service Adapter](./README.md)
- [OpenAI Provider](./OPENAI_PROVIDER_USAGE.md)
- [Anthropic Provider](./ANTHROPIC_PROVIDER_USAGE.md)
- [Prompt Templates](./PROMPT_TEMPLATES_USAGE.md)
