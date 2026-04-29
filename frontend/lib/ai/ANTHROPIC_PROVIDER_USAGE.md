# Anthropic Provider Usage Guide

## Overview

The `AnthropicProvider` implements the `AIProvider` interface for Anthropic's Claude models. It provides text summarization and quiz generation capabilities using Claude-3-Sonnet and other Claude models.

## Features

- **Text Summarization**: Generate concise summaries with key points extraction
- **Quiz Generation**: Create multiple-choice questions with explanations
- **Token Counting**: Approximate token usage for budget management
- **JSON Response Parsing**: Structured output from Claude models
- **Error Handling**: Comprehensive error handling with retry logic

## Installation

The Anthropic SDK is required:

```bash
npm install @anthropic-ai/sdk
```

## Configuration

Set the following environment variables:

```bash
AI_PROVIDER=anthropic
AI_API_KEY=your-anthropic-api-key
AI_MODEL=claude-3-sonnet-20240229
```

## Basic Usage

### Direct Provider Usage

```typescript
import { AnthropicProvider } from "@/lib/ai";
import type { AIConfig } from "@/lib/ai";

const config: AIConfig = {
  provider: "anthropic",
  apiKey: process.env.AI_API_KEY!,
  model: "claude-3-sonnet-20240229",
  maxInputTokens: 4000,
  maxOutputTokens: {
    summary: 500,
    quiz: 1000,
  },
  timeout: 15000,
};

const provider = new AnthropicProvider(config);

// Summarize text
const summary = await provider.summarize(
  "Your text to summarize here...",
  {
    maxKeyPoints: 5,
    temperature: 0.3,
  }
);

console.log(summary.summary);
console.log(summary.keyPoints);
console.log(summary.metadata);

// Generate quiz
const quiz = await provider.generateQuiz(
  "Your text to create questions from...",
  {
    questionCount: 4,
    difficulty: "medium",
    temperature: 0.5,
  }
);

console.log(quiz.questions);
console.log(quiz.metadata);
```

### Using with AI Service Adapter

The recommended approach is to use the `AIServiceAdapter` which provides caching, validation, and error handling:

```typescript
import { AnthropicProvider, AIServiceAdapter } from "@/lib/ai";
import type { AIConfig } from "@/lib/ai";

const config: AIConfig = {
  provider: "anthropic",
  apiKey: process.env.AI_API_KEY!,
  model: "claude-3-sonnet-20240229",
  maxInputTokens: 4000,
  maxOutputTokens: {
    summary: 500,
    quiz: 1000,
  },
  cacheEnabled: true,
};

const provider = new AnthropicProvider(config);
const adapter = new AIServiceAdapter(provider, config);

// The adapter handles validation, caching, and error handling
const summary = await adapter.summarize("Your text here...");
const quiz = await adapter.generateQuiz("Your text here...");
```

## API Reference

### Constructor

```typescript
constructor(config: AIConfig)
```

Creates a new Anthropic provider instance.

**Parameters:**
- `config.apiKey` (string, required): Anthropic API key
- `config.model` (string, optional): Model name (default: "claude-3-sonnet-20240229")
- `config.timeout` (number, optional): Request timeout in milliseconds (default: 15000)

### Methods

#### `summarize(text: string, options?: SummarizeOptions): Promise<SummaryResult>`

Generate a summary and key points from input text.

**Parameters:**
- `text` (string): Input text to summarize
- `options.maxKeyPoints` (number, optional): Number of key points to extract (3-7, default: 5)
- `options.temperature` (number, optional): Temperature for generation (0-1, default: 0.3)

**Returns:**
```typescript
{
  summary: string;
  keyPoints: string[];
  metadata: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    cached: boolean;
    processingTime: number;
  };
}
```

#### `generateQuiz(text: string, options?: QuizOptions): Promise<QuizResult>`

Generate quiz questions from input text.

**Parameters:**
- `text` (string): Input text to generate questions from
- `options.questionCount` (number, optional): Number of questions (3-5, default: 4)
- `options.difficulty` (string, optional): Difficulty level ("easy" | "medium" | "hard", default: "medium")
- `options.temperature` (number, optional): Temperature for generation (0-1, default: 0.5)

**Returns:**
```typescript
{
  questions: Array<{
    id: string;
    question: string;
    options: [string, string, string, string];
    correctAnswer: number;
    explanation: string;
  }>;
  metadata: {
    inputTokens: number;
    outputTokens: number;
    model: string;
    cached: boolean;
    processingTime: number;
  };
}
```

#### `countTokens(text: string): number`

Count approximate tokens in text using 4 characters ≈ 1 token.

**Parameters:**
- `text` (string): Text to count tokens for

**Returns:** Approximate token count

## Supported Models

- `claude-3-sonnet-20240229` (default, recommended)
- `claude-3-opus-20240229` (higher quality, slower)
- `claude-3-haiku-20240307` (faster, lower cost)
- Other Claude-3 models

## Error Handling

The provider throws errors for:

- **Empty Response**: When Claude returns no content
- **Invalid Response Type**: When response is not text (e.g., image)
- **Invalid JSON**: When response cannot be parsed as JSON
- **API Errors**: Network errors, rate limits, timeouts

Example error handling:

```typescript
try {
  const summary = await provider.summarize(text);
} catch (error) {
  if (error.message.includes("rate limit")) {
    console.error("Rate limit exceeded, retry later");
  } else if (error.message.includes("timeout")) {
    console.error("Request timed out");
  } else {
    console.error("AI service error:", error.message);
  }
}
```

## Token Usage and Costs

The provider tracks token usage in the metadata:

```typescript
const result = await provider.summarize(text);
console.log(`Input tokens: ${result.metadata.inputTokens}`);
console.log(`Output tokens: ${result.metadata.outputTokens}`);
console.log(`Total tokens: ${result.metadata.inputTokens + result.metadata.outputTokens}`);
```

**Approximate Costs (Claude-3-Sonnet):**
- Input: $3 per million tokens
- Output: $15 per million tokens

## Comparison with OpenAI Provider

| Feature | Anthropic | OpenAI |
|---------|-----------|--------|
| API Format | Messages API | Chat Completions API |
| JSON Mode | Parse from text | Native `response_format` |
| Token Counting | Approximation | Approximation |
| Default Model | claude-3-sonnet | gpt-4 |
| System Messages | Not used | Used |
| Temperature Default | 0.3 (summary), 0.5 (quiz) | Same |

## Best Practices

1. **Use the AI Service Adapter**: Provides caching, validation, and error handling
2. **Set Appropriate Timeouts**: Claude can be slower than GPT-4 for complex tasks
3. **Monitor Token Usage**: Track costs using metadata
4. **Handle Errors Gracefully**: Implement retry logic for transient failures
5. **Cache Responses**: Enable caching to reduce costs and latency
6. **Validate Input**: Check text length before calling the API

## Testing

The provider includes comprehensive unit tests:

```bash
npm test -- anthropic-provider.test.ts
```

Tests cover:
- Constructor initialization
- Token counting
- Summarization with various options
- Quiz generation with various options
- Error handling
- Response validation

## Requirements Validation

This implementation validates:

- **Requirement 4.2**: AI Service Provider Selection (Anthropic support)
- **Requirement 2.1**: AI Text Summarization
- **Requirement 3.1**: AI Quiz Generation

## Related Documentation

- [OpenAI Provider Usage](./OPENAI_PROVIDER_USAGE.md)
- [AI Service Adapter](./README.md)
- [API Types](./types.ts)
