# AI Service Module

This module provides a unified interface for AI service integration, supporting multiple providers (OpenAI and Anthropic) through a common adapter pattern.

## Overview

The AI service adapter provides:
- **Unified Interface**: Single API for multiple AI providers
- **Input Validation**: Automatic validation of text input and token limits
- **Token Counting**: Approximate token counting for cost control
- **Cache Integration**: Hooks for caching AI responses
- **Error Handling**: Consistent error handling across providers
- **Response Validation**: Automatic validation of AI responses

## Architecture

```
frontend/lib/ai/
├── types.ts                    # Type definitions and interfaces
├── ai-service-adapter.ts       # Main adapter implementation
├── index.ts                    # Public exports
├── __tests__/
│   ├── ai-service-adapter.test.ts  # Unit tests
│   └── validate-adapter.ts         # Validation script
└── README.md                   # This file
```

## Usage

### Basic Setup

```typescript
import { AIServiceAdapter } from "@/lib/ai";
import type { AIProvider, AIConfig } from "@/lib/ai";

// Create a provider implementation (OpenAI or Anthropic)
const provider: AIProvider = new OpenAIProvider(config);

// Configure the adapter
const config: AIConfig = {
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY!,
  model: "gpt-4",
  maxInputTokens: 4000,
  maxOutputTokens: {
    summary: 500,
    quiz: 1000,
  },
  timeout: 15000,
  cacheEnabled: true,
};

// Create the adapter
const adapter = new AIServiceAdapter(provider, config);
```

### Text Summarization

```typescript
// Summarize text
const result = await adapter.summarize(
  "Your text to summarize here...",
  {
    maxKeyPoints: 5,
    temperature: 0.3,
  }
);

console.log(result.summary);
console.log(result.keyPoints);
console.log(result.metadata.cached); // Was this cached?
console.log(result.metadata.processingTime); // How long did it take?
```

### Quiz Generation

```typescript
// Generate quiz questions
const result = await adapter.generateQuiz(
  "Your text to generate questions from...",
  {
    questionCount: 4,
    difficulty: "medium",
    temperature: 0.5,
  }
);

result.questions.forEach((q) => {
  console.log(q.question);
  console.log(q.options);
  console.log(`Correct: ${q.correctAnswer}`);
  console.log(q.explanation);
});
```

### Cache Integration

```typescript
// Set up cache integration
adapter.setCacheIntegration(
  // Check cache function
  async (key: string) => {
    return await cacheManager.get(key);
  },
  // Store cache function
  async (key: string, value: any) => {
    await cacheManager.set(key, value);
  }
);

// Now all requests will check cache first
const result = await adapter.summarize(text);
console.log(result.metadata.cached); // true if from cache
```

### Token Counting

```typescript
// Count tokens before making a request
const tokenCount = adapter.countTokens(text);
console.log(`This text has approximately ${tokenCount} tokens`);

// The adapter automatically validates token limits
try {
  await adapter.summarize(veryLongText);
} catch (error) {
  if (error.code === "TOKEN_LIMIT_EXCEEDED") {
    console.log("Text is too long!");
  }
}
```

## Input Validation

The adapter automatically validates inputs according to requirements:

### Summarization
- **Minimum length**: 1 character (returns original text if < 50 chars)
- **Maximum tokens**: Configured via `maxInputTokens` (default: 4000)
- **Key points**: Response must contain 3-7 key points

### Quiz Generation
- **Minimum length**: 100 characters
- **Maximum tokens**: Configured via `maxInputTokens` (default: 4000)
- **Question count**: Response must contain 3-5 questions
- **Options**: Each question must have exactly 4 options
- **Correct answer**: Must be between 0 and 3

## Error Handling

The adapter handles various error scenarios:

```typescript
import { APIError } from "@/lib/errors";

try {
  const result = await adapter.summarize(text);
} catch (error) {
  if (error instanceof APIError) {
    switch (error.code) {
      case "INVALID_INPUT":
        console.log("Invalid input:", error.message);
        break;
      case "TOKEN_LIMIT_EXCEEDED":
        console.log("Text too long:", error.message);
        break;
      case "AI_RATE_LIMIT":
        console.log("Rate limited, retry after:", error.retryAfter);
        break;
      case "AI_TIMEOUT":
        console.log("Request timed out");
        break;
      case "AI_SERVICE_ERROR":
        console.log("AI service error:", error.details);
        break;
      case "INVALID_AI_RESPONSE":
        console.log("Invalid response from AI");
        break;
    }
  }
}
```

## Type Definitions

### AIProvider Interface

```typescript
interface AIProvider {
  name: "openai" | "anthropic";
  summarize(text: string, options?: SummarizeOptions): Promise<SummaryResult>;
  generateQuiz(text: string, options?: QuizOptions): Promise<QuizResult>;
  countTokens(text: string): number;
}
```

### AIConfig

```typescript
interface AIConfig {
  provider: "openai" | "anthropic";
  apiKey: string;
  model: string;
  maxInputTokens: number;
  maxOutputTokens: {
    summary: number;
    quiz: number;
  };
  timeout?: number;
  cacheEnabled?: boolean;
}
```

### SummaryResult

```typescript
interface SummaryResult {
  summary: string;
  keyPoints: string[];
  metadata: AIMetadata;
}
```

### QuizResult

```typescript
interface QuizResult {
  questions: QuizQuestion[];
  metadata: AIMetadata;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctAnswer: number;
  explanation: string;
}
```

### AIMetadata

```typescript
interface AIMetadata {
  inputTokens: number;
  outputTokens: number;
  model: string;
  cached: boolean;
  processingTime: number;
}
```

## Requirements Validation

This implementation validates the following requirements:

- **Requirement 4.4**: AI service provider abstraction with common interface
- **Requirement 2.4**: Input validation and token limit enforcement (4000 tokens)
- **Requirement 2.8**: Input sanitization and validation
- **Requirement 2.3**: Short text handling (< 50 words returns original)
- **Requirement 2.2**: Key points extraction (3-7 points)
- **Requirement 3.5**: Minimum text length for quiz generation (100 chars)
- **Requirement 3.1**: Quiz question count (3-5 questions)
- **Requirement 3.2**: Question structure (exactly 4 options)
- **Requirement 3.3**: Correct answer validation (0-3)
- **Requirement 3.7**: Response validation before returning to client

## Testing

### Run Unit Tests

```bash
# Run all tests (when test framework is configured)
npm test

# Run specific test file
npm test -- lib/ai/__tests__/ai-service-adapter.test.ts
```

### Run Validation Script

```bash
# Validate implementation compiles and works
npx tsx lib/ai/__tests__/validate-adapter.ts
```

## Next Steps

To complete the AI integration:

1. **Task 3.2**: Implement OpenAI provider (`openai-provider.ts`)
2. **Task 3.3**: Implement Anthropic provider (`anthropic-provider.ts`)
3. **Task 3.4**: Create prompt templates
4. **Task 3.5**: Implement token manager
5. **Task 3.6**: Create AI API endpoints

## Related Files

- `frontend/lib/errors.ts` - Error handling utilities
- `frontend/lib/config/` - Configuration management
- `frontend/lib/api-types.ts` - API type definitions
- `frontend/app/api/v1/ai/` - AI API endpoints (to be implemented)

## References

- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference)
- Design Document: `.kiro/specs/backend-ai-notifications-analytics/design.md`
- Requirements: `.kiro/specs/backend-ai-notifications-analytics/requirements.md`
