# OpenAI Provider Usage Guide

This guide demonstrates how to use the OpenAI provider implementation for text summarization and quiz generation.

## Installation

The OpenAI SDK is already installed as a dependency:

```bash
npm install openai
```

## Basic Usage

### 1. Create an OpenAI Provider Instance

```typescript
import { OpenAIProvider, AIServiceAdapter } from "@/lib/ai";
import type { AIConfig } from "@/lib/ai";

// Configuration
const config: AIConfig = {
  provider: "openai",
  apiKey: process.env.AI_API_KEY!, // Your OpenAI API key
  model: "gpt-4", // or "gpt-3.5-turbo"
  maxInputTokens: 4000,
  maxOutputTokens: {
    summary: 500,
    quiz: 1000,
  },
  timeout: 15000,
  cacheEnabled: true,
};

// Create provider
const provider = new OpenAIProvider(config);

// Create adapter (recommended for production use)
const adapter = new AIServiceAdapter(provider, config);
```

### 2. Text Summarization

```typescript
// Summarize text
const text = `
  Artificial intelligence (AI) is intelligence demonstrated by machines, 
  in contrast to the natural intelligence displayed by humans and animals. 
  Leading AI textbooks define the field as the study of "intelligent agents": 
  any device that perceives its environment and takes actions that maximize 
  its chance of successfully achieving its goals.
`;

const summary = await adapter.summarize(text, {
  maxKeyPoints: 5,
  temperature: 0.3,
});

console.log("Summary:", summary.summary);
console.log("Key Points:", summary.keyPoints);
console.log("Tokens Used:", {
  input: summary.metadata.inputTokens,
  output: summary.metadata.outputTokens,
});
```

**Output:**
```json
{
  "summary": "Artificial intelligence refers to intelligence exhibited by machines, contrasting with natural intelligence in humans and animals. The field focuses on studying intelligent agents that perceive their environment and act to achieve goals.",
  "keyPoints": [
    "AI is intelligence demonstrated by machines",
    "Contrasts with natural intelligence in humans and animals",
    "Defined as the study of intelligent agents",
    "Agents perceive their environment",
    "Agents take actions to maximize goal achievement"
  ],
  "metadata": {
    "inputTokens": 85,
    "outputTokens": 120,
    "model": "gpt-4",
    "cached": false,
    "processingTime": 1250
  }
}
```

### 3. Quiz Generation

```typescript
// Generate quiz questions
const quizText = `
  Photosynthesis is the process by which plants use sunlight, water, and 
  carbon dioxide to create oxygen and energy in the form of sugar. This 
  process is crucial for life on Earth as it produces oxygen and serves 
  as the base of the food chain.
`;

const quiz = await adapter.generateQuiz(quizText, {
  questionCount: 4,
  difficulty: "medium",
  temperature: 0.5,
});

console.log("Questions:", quiz.questions);
```

**Output:**
```json
{
  "questions": [
    {
      "id": "1234567890-0",
      "question": "What is photosynthesis?",
      "options": [
        "The process plants use to create oxygen and sugar",
        "The process animals use to breathe",
        "The process of water evaporation",
        "The process of soil formation"
      ],
      "correctAnswer": 0,
      "explanation": "Photosynthesis is the process by which plants use sunlight, water, and carbon dioxide to create oxygen and energy in the form of sugar."
    },
    {
      "id": "1234567890-1",
      "question": "What do plants need for photosynthesis?",
      "options": [
        "Oxygen and nitrogen",
        "Sunlight, water, and carbon dioxide",
        "Soil and minerals",
        "Heat and pressure"
      ],
      "correctAnswer": 1,
      "explanation": "Plants require sunlight, water, and carbon dioxide to perform photosynthesis."
    }
  ],
  "metadata": {
    "inputTokens": 65,
    "outputTokens": 250,
    "model": "gpt-4",
    "cached": false,
    "processingTime": 2100
  }
}
```

### 4. Token Counting

```typescript
// Count tokens before making API call
const text = "This is a sample text for token counting.";
const tokenCount = provider.countTokens(text);

console.log(`Text has approximately ${tokenCount} tokens`);
// Output: Text has approximately 10 tokens
```

## Advanced Usage

### With Cache Integration

```typescript
// Simple in-memory cache
const cache = new Map<string, any>();

adapter.setCacheIntegration(
  // Check cache function
  async (key: string) => {
    return cache.get(key) || null;
  },
  // Store cache function
  async (key: string, value: any) => {
    cache.set(key, value);
  }
);

// First call - hits API
const result1 = await adapter.summarize(text);
console.log("Cached:", result1.metadata.cached); // false

// Second call - hits cache
const result2 = await adapter.summarize(text);
console.log("Cached:", result2.metadata.cached); // true
```

### Error Handling

```typescript
try {
  const result = await adapter.summarize(text);
  console.log(result);
} catch (error) {
  if (error instanceof APIError) {
    switch (error.code) {
      case "INVALID_INPUT":
        console.error("Invalid input:", error.message);
        break;
      case "TOKEN_LIMIT_EXCEEDED":
        console.error("Text too long:", error.message);
        break;
      case "AI_RATE_LIMIT":
        console.error("Rate limit exceeded. Retry after:", error.retryAfter);
        break;
      case "AI_TIMEOUT":
        console.error("Request timed out:", error.message);
        break;
      case "AI_SERVICE_ERROR":
        console.error("AI service error:", error.message);
        break;
      default:
        console.error("Unknown error:", error.message);
    }
  } else {
    console.error("Unexpected error:", error);
  }
}
```

### Custom Options

```typescript
// Summarization with custom options
const customSummary = await adapter.summarize(text, {
  maxKeyPoints: 7, // Extract up to 7 key points
  temperature: 0.1, // Very deterministic (0.0-1.0)
});

// Quiz generation with custom options
const customQuiz = await adapter.generateQuiz(text, {
  questionCount: 5, // Generate 5 questions
  difficulty: "hard", // Hard difficulty level
  temperature: 0.8, // More creative questions
});
```

## Environment Variables

Set these environment variables in your `.env.local` file:

```bash
# AI Configuration
AI_PROVIDER=openai
AI_API_KEY=sk-your-openai-api-key-here
AI_MODEL=gpt-4
AI_MAX_INPUT_TOKENS=4000
AI_MAX_OUTPUT_TOKENS_SUMMARY=500
AI_MAX_OUTPUT_TOKENS_QUIZ=1000
AI_REQUEST_TIMEOUT=15000

# Cache Configuration
CACHE_ENABLED=true
CACHE_TTL=86400
CACHE_MAX_ENTRIES=1000
```

## API Endpoints Integration

### Summarization Endpoint

```typescript
// app/api/v1/ai/summarize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { OpenAIProvider, AIServiceAdapter } from "@/lib/ai";
import { getConfig } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const { text, options } = await request.json();
    
    const config = getConfig();
    const provider = new OpenAIProvider(config.ai);
    const adapter = new AIServiceAdapter(provider, config.ai);
    
    const result = await adapter.summarize(text, options);
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || "INTERNAL_ERROR",
          message: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

### Quiz Generation Endpoint

```typescript
// app/api/v1/ai/generate-quiz/route.ts
import { NextRequest, NextResponse } from "next/server";
import { OpenAIProvider, AIServiceAdapter } from "@/lib/ai";
import { getConfig } from "@/lib/config";

export async function POST(request: NextRequest) {
  try {
    const { text, options } = await request.json();
    
    const config = getConfig();
    const provider = new OpenAIProvider(config.ai);
    const adapter = new AIServiceAdapter(provider, config.ai);
    
    const result = await adapter.generateQuiz(text, options);
    
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code || "INTERNAL_ERROR",
          message: error.message,
        },
      },
      { status: 500 }
    );
  }
}
```

## Testing

Run the test suite:

```bash
npm test -- lib/ai/__tests__/openai-provider.test.ts
```

All 26 tests should pass, covering:
- Constructor and configuration
- Token counting
- Summarization (success cases, error handling)
- Quiz generation (success cases, error handling)
- Custom options
- Error propagation

## Best Practices

1. **Always use the AIServiceAdapter** instead of the provider directly for production code
2. **Implement caching** to reduce API costs and improve response times
3. **Handle errors gracefully** with appropriate user feedback
4. **Validate input** before sending to the API
5. **Monitor token usage** to control costs
6. **Use appropriate temperature settings**:
   - 0.0-0.3 for factual, deterministic outputs (summaries)
   - 0.4-0.7 for balanced creativity (quiz questions)
   - 0.8-1.0 for highly creative outputs
7. **Set reasonable timeouts** to prevent hanging requests
8. **Implement rate limiting** to prevent abuse

## Requirements Validation

This implementation validates the following requirements:

- **Requirement 4.2**: AI Service Provider Selection - OpenAI provider with GPT-4 support
- **Requirement 2.1**: AI Text Summarization - Sends text to AI service with prompt template
- **Requirement 3.1**: AI Quiz Generation - Creates 3-5 multiple-choice questions
- **Requirement 2.7**: Prompt templates with JSON response format
- **Requirement 2.4**: Token limit enforcement (4000 tokens)
- **Requirement 4.2**: Token counting approximation

## Next Steps

1. Implement Anthropic Claude provider (task 3.3)
2. Add response caching layer (task 3.4)
3. Implement rate limiting (task 3.5)
4. Create API endpoints (tasks 4.x)
5. Add frontend integration (tasks 5.x)
