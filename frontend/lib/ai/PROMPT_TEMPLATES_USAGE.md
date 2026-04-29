# Prompt Templates Usage Guide

## Overview

The prompt templates module provides reusable, configurable prompt templates for AI service interactions. It centralizes prompt management and supports template variable substitution for dynamic content generation.

**Validates: Requirements 2.7, 3.6**

## Features

- ✅ Centralized prompt template management
- ✅ Template variable substitution with `{placeholder}` syntax
- ✅ Summarization prompts with key points extraction
- ✅ Quiz generation prompts with difficulty levels
- ✅ Type-safe interfaces for all functions
- ✅ Comprehensive unit test coverage (42 tests)

## Installation

The prompt templates are part of the AI service module and are automatically available when you import from `@/lib/ai`:

```typescript
import {
  generateSummarizationPrompt,
  generateQuizPrompt,
  substituteVariables,
} from "@/lib/ai";
```

## API Reference

### `generateSummarizationPrompt(content, options?)`

Generates a prompt for AI text summarization with key points extraction.

**Parameters:**
- `content: string` - Text content to summarize
- `options?: SummarizeOptions` - Optional configuration
  - `maxKeyPoints?: number` - Number of key points to extract (default: 5)
  - `temperature?: number` - AI temperature setting (not used in prompt, passed to provider)

**Returns:** `string` - Formatted prompt ready for AI service

**Example:**
```typescript
const prompt = generateSummarizationPrompt(
  "Photosynthesis is the process by which plants convert light energy...",
  { maxKeyPoints: 7 }
);
```

### `generateQuizPrompt(content, options?)`

Generates a prompt for AI quiz question generation with difficulty levels.

**Parameters:**
- `content: string` - Text content to generate quiz questions from
- `options?: QuizOptions` - Optional configuration
  - `questionCount?: number` - Number of questions to generate (default: 4)
  - `difficulty?: "easy" | "medium" | "hard"` - Question difficulty (default: "medium")
  - `temperature?: number` - AI temperature setting (not used in prompt, passed to provider)

**Returns:** `string` - Formatted prompt ready for AI service

**Example:**
```typescript
const prompt = generateQuizPrompt(
  "The water cycle involves evaporation, condensation, and precipitation...",
  { questionCount: 5, difficulty: "hard" }
);
```

### `substituteVariables(template, variables)`

Low-level function for template variable substitution. Replaces all `{variableName}` placeholders with corresponding values.

**Parameters:**
- `template: string` - Template string with `{variable}` placeholders
- `variables: TemplateVariables` - Object mapping variable names to values

**Returns:** `string` - Template with variables substituted

**Example:**
```typescript
const result = substituteVariables(
  "Hello {name}, you are {age} years old",
  { name: "Alice", age: 25 }
);
// Returns: "Hello Alice, you are 25 years old"
```

### `getSummarizationTemplate()`

Returns the raw summarization template with placeholders intact (useful for testing/inspection).

**Returns:** `string` - Raw template string

### `getQuizTemplate()`

Returns the raw quiz generation template with placeholders intact (useful for testing/inspection).

**Returns:** `string` - Raw template string

## Usage Examples

### Basic Summarization

```typescript
import { generateSummarizationPrompt } from "@/lib/ai";

const content = `
  Photosynthesis is the process by which plants convert light energy into chemical energy.
  It occurs in the chloroplasts and involves two main stages: light-dependent reactions
  and the Calvin cycle.
`;

const prompt = generateSummarizationPrompt(content);
// Use prompt with OpenAI or Anthropic provider
```

### Custom Key Points Count

```typescript
const prompt = generateSummarizationPrompt(content, {
  maxKeyPoints: 3, // Extract only 3 key points
});
```

### Basic Quiz Generation

```typescript
import { generateQuizPrompt } from "@/lib/ai";

const content = `
  The water cycle describes how water moves through Earth's systems.
  It includes evaporation, condensation, precipitation, and collection.
`;

const prompt = generateQuizPrompt(content);
// Use prompt with OpenAI or Anthropic provider
```

### Custom Quiz Options

```typescript
const prompt = generateQuizPrompt(content, {
  questionCount: 5,
  difficulty: "hard",
});
```

### Using with AI Providers

The prompt templates are automatically used by the OpenAI and Anthropic providers:

```typescript
import { OpenAIProvider } from "@/lib/ai";

const provider = new OpenAIProvider({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY!,
  model: "gpt-4",
  maxInputTokens: 4000,
  maxOutputTokens: { summary: 500, quiz: 1000 },
});

// The provider internally uses generateSummarizationPrompt
const result = await provider.summarize(content, { maxKeyPoints: 5 });
```

### Custom Template Variables

For advanced use cases, you can use `substituteVariables` directly:

```typescript
import { substituteVariables } from "@/lib/ai";

const customTemplate = `
  Analyze the following {type} and provide {count} insights:
  {content}
`;

const prompt = substituteVariables(customTemplate, {
  type: "research paper",
  count: 5,
  content: "Paper content here...",
});
```

## Template Format

### Summarization Template

The summarization template includes:
- Role definition: "expert study assistant"
- Clear instructions for summary creation (2-4 sentences)
- Key points extraction (configurable count)
- JSON response format specification
- Student-friendly language requirement

**Variables:**
- `{text}` - Content to summarize
- `{maxKeyPoints}` - Number of key points to extract

### Quiz Generation Template

The quiz generation template includes:
- Role definition: "expert educator"
- Question count specification
- Difficulty level guidance
- Format requirements (4 options, correct answer, explanation)
- Comprehension focus (not memorization)
- JSON response format specification

**Variables:**
- `{text}` - Content to generate questions from
- `{questionCount}` - Number of questions to generate
- `{difficulty}` - Difficulty level (easy/medium/hard)

## Integration with Providers

Both OpenAI and Anthropic providers use these templates internally:

```typescript
// OpenAI Provider (openai-provider.ts)
async summarize(text: string, options?: SummarizeOptions): Promise<SummaryResult> {
  const prompt = generateSummarizationPrompt(text, options);
  // ... call OpenAI API with prompt
}

// Anthropic Provider (anthropic-provider.ts)
async generateQuiz(text: string, options?: QuizOptions): Promise<QuizResult> {
  const prompt = generateQuizPrompt(text, options);
  // ... call Anthropic API with prompt
}
```

## Testing

The module includes comprehensive unit tests covering:

- ✅ Variable substitution (13 tests)
  - Single and multiple variables
  - Numeric values and special characters
  - Edge cases (empty strings, unmatched placeholders)
  
- ✅ Summarization prompts (10 tests)
  - Default and custom options
  - Content handling (long text, special chars, newlines)
  - JSON format instructions
  
- ✅ Quiz prompts (11 tests)
  - Default and custom options
  - Difficulty levels
  - Content handling
  
- ✅ Template getters (4 tests)
  - Raw template retrieval
  
- ✅ Integration scenarios (4 tests)
  - Realistic study content
  - Different options combinations

Run tests:
```bash
npm test -- prompt-templates.test.ts
```

## Requirements Validation

**Requirement 2.7**: Prompt templates with JSON response format
- ✅ Summarization template instructs AI to return JSON with `summary` and `keyPoints` fields
- ✅ Quiz template instructs AI to return JSON with `questions` array
- ✅ Both templates specify exact JSON structure

**Requirement 3.6**: Quiz generation prompt with difficulty levels
- ✅ Quiz template includes `{difficulty}` variable
- ✅ Supports "easy", "medium", and "hard" difficulty levels
- ✅ Instructions vary based on difficulty setting

## Best Practices

1. **Use Default Options**: The default values (5 key points, 4 questions, medium difficulty) are well-tested and work for most use cases.

2. **Validate Content Length**: Check content length before generating prompts to avoid token limit issues:
   ```typescript
   if (content.length > 16000) { // ~4000 tokens
     throw new Error("Content too long");
   }
   ```

3. **Handle Special Characters**: The template substitution handles special characters safely, but be aware of content that might confuse the AI (e.g., JSON in the input text).

4. **Consistent Options**: Use the same options across multiple requests for consistent results.

5. **Temperature Settings**: While temperature is passed through options, it's applied at the provider level, not in the prompt template.

## Troubleshooting

### Issue: Variables not being substituted

**Cause**: Variable name mismatch or typo in placeholder

**Solution**: Ensure placeholder names match exactly (case-sensitive):
```typescript
// ❌ Wrong
substituteVariables("{Name}", { name: "Alice" });

// ✅ Correct
substituteVariables("{name}", { name: "Alice" });
```

### Issue: AI returns invalid JSON

**Cause**: Content might contain confusing JSON-like structures

**Solution**: The templates include clear JSON format instructions. If issues persist, consider sanitizing input content or adjusting the AI temperature.

### Issue: Key points count doesn't match request

**Cause**: AI might generate fewer points if content is limited

**Solution**: This is expected behavior. The template requests a specific count, but the AI will generate fewer if the content doesn't support more key points.

## Related Documentation

- [AI Service Adapter](./README.md) - Main AI service documentation
- [OpenAI Provider](./OPENAI_PROVIDER_USAGE.md) - OpenAI-specific usage
- [Anthropic Provider](./ANTHROPIC_PROVIDER_USAGE.md) - Anthropic-specific usage
- [Requirements Document](../../../.kiro/specs/backend-ai-notifications-analytics/requirements.md)
- [Design Document](../../../.kiro/specs/backend-ai-notifications-analytics/design.md)

## Implementation Details

**File**: `frontend/lib/ai/prompt-templates.ts`
**Tests**: `frontend/lib/ai/__tests__/prompt-templates.test.ts`
**Task**: 3.4 - Implement prompt templates
**Requirements**: 2.7, 3.6
