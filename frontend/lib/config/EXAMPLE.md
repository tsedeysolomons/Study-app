# Configuration System Examples

This document provides practical examples of using the configuration system.

## Example 1: Basic Configuration Access

```typescript
import { getConfig } from '@/lib/config';

// Get the configuration singleton
const config = getConfig();

// Access configuration values
console.log('Environment:', config.nodeEnv);
console.log('Storage mode:', config.storage.mode);
console.log('Rate limit:', config.rateLimit.requestsPerHour, 'requests/hour');

// Use configuration in your code
if (config.ai.provider === 'openai') {
  // Use OpenAI
} else if (config.ai.provider === 'anthropic') {
  // Use Anthropic
}
```

## Example 2: Secure Secrets Access

```typescript
import { getSecretsManager } from '@/lib/config';

const secretsManager = getSecretsManager();

// Get API key securely
try {
  const apiKey = secretsManager.getSecret('AI_API_KEY');
  // Use apiKey to make API calls
} catch (error) {
  console.error('AI API key not configured');
}

// Check if a secret exists before using it
if (secretsManager.hasSecret('DATABASE_URL')) {
  const dbUrl = secretsManager.getSecret('DATABASE_URL');
  // Connect to database
}
```

## Example 3: Safe Logging

```typescript
import { getConfig, getSecretsManager } from '@/lib/config';

const config = getConfig();
const secretsManager = getSecretsManager();

// Create a safe version of config for logging
const safeConfig = secretsManager.createSafeConfig(config);

// This is safe to log - secrets are masked
console.log('Application configuration:', JSON.stringify(safeConfig, null, 2));

// Output:
// {
//   "ai": {
//     "provider": "openai",
//     "apiKey": "***cdef",  // Masked!
//     "model": "gpt-4"
//   },
//   ...
// }
```

## Example 4: Configuration Validation

```typescript
import { validateConfig } from '@/lib/config';

// Validate configuration before starting the app
const result = validateConfig();

if (!result.valid) {
  console.error('Configuration errors:');
  result.errors.forEach(error => console.error('  -', error));
  process.exit(1);
}

if (result.warnings.length > 0) {
  console.warn('Configuration warnings:');
  result.warnings.forEach(warning => console.warn('  -', warning));
}

console.log('Configuration is valid!');
```

## Example 5: Conditional Feature Enablement

```typescript
import { getConfig } from '@/lib/config';

const config = getConfig();

// Enable features based on configuration
export const features = {
  aiSummarization: config.ai.provider !== undefined && config.ai.apiKey !== undefined,
  aiQuizGeneration: config.ai.provider !== undefined && config.ai.apiKey !== undefined,
  database: config.storage.mode === 'database',
  authentication: config.auth.required,
  rateLimit: config.rateLimit.enabled,
  cache: config.cache.enabled,
  analytics: config.analytics.vercelEnabled,
};

// Use in components
if (features.aiSummarization) {
  // Show AI summarization button
}
```

## Example 6: API Route Configuration

```typescript
// app/api/v1/ai/summarize/route.ts
import { getConfig, getSecretsManager } from '@/lib/config';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const config = getConfig();
  const secretsManager = getSecretsManager();

  // Check if AI is configured
  if (!config.ai.provider || !secretsManager.hasSecret('AI_API_KEY')) {
    return NextResponse.json(
      { error: 'AI service not configured' },
      { status: 503 }
    );
  }

  // Get API key securely
  const apiKey = secretsManager.getSecret('AI_API_KEY');

  // Use configuration values
  const maxTokens = config.ai.maxInputTokens;
  const timeout = config.ai.timeout;

  // Make AI API call with configuration
  // ...
}
```

## Example 7: Environment-Specific Configuration

```typescript
import { getConfig } from '@/lib/config';

const config = getConfig();

// Different behavior based on environment
if (config.nodeEnv === 'development') {
  console.log('Running in development mode');
  // Enable debug features
} else if (config.nodeEnv === 'production') {
  console.log('Running in production mode');
  // Enable production optimizations
}

// Adjust logging level
const logger = createLogger({
  level: config.logging.level,
});
```

## Example 8: Testing with Mock Configuration

```typescript
import { resetConfig } from '@/lib/config';

describe('My Feature', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset configuration singleton
    resetConfig();

    // Set test environment variables
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      AI_PROVIDER: 'openai',
      AI_API_KEY: 'test-key-1234567890',
      STORAGE_MODE: 'localStorage',
    };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    resetConfig();
  });

  it('should work with test configuration', () => {
    const config = getConfig();
    expect(config.nodeEnv).toBe('test');
    expect(config.ai.provider).toBe('openai');
  });
});
```

## Example 9: Pre-Deployment Validation Script

```bash
#!/bin/bash

# Validate configuration before deployment
npm run validate-config

if [ $? -eq 0 ]; then
  echo "Configuration is valid, proceeding with deployment"
  npm run build
  npm run deploy
else
  echo "Configuration validation failed, aborting deployment"
  exit 1
fi
```

## Example 10: Dynamic Configuration Updates

```typescript
import { getConfig, resetConfig } from '@/lib/config';

// Note: Configuration is cached as a singleton
// To reload configuration (e.g., after env var changes):

// 1. Reset the singleton
resetConfig();

// 2. Get fresh configuration
const config = getConfig();

// This is useful in development but should be avoided in production
// as configuration should be static after application startup
```

## Common Patterns

### Pattern 1: Feature Flags

```typescript
import { getConfig } from '@/lib/config';

const config = getConfig();

export const isFeatureEnabled = (feature: string): boolean => {
  switch (feature) {
    case 'ai':
      return !!config.ai.provider && !!config.ai.apiKey;
    case 'database':
      return config.storage.mode === 'database';
    case 'auth':
      return config.auth.required;
    case 'rateLimit':
      return config.rateLimit.enabled;
    case 'cache':
      return config.cache.enabled;
    default:
      return false;
  }
};
```

### Pattern 2: Configuration-Based Service Factory

```typescript
import { getConfig, getSecretsManager } from '@/lib/config';
import { OpenAIProvider } from './openai-provider';
import { AnthropicProvider } from './anthropic-provider';

export function createAIProvider() {
  const config = getConfig();
  const secretsManager = getSecretsManager();

  if (!config.ai.provider) {
    throw new Error('AI provider not configured');
  }

  const apiKey = secretsManager.getSecret('AI_API_KEY');
  if (!apiKey) {
    throw new Error('AI API key not configured');
  }

  switch (config.ai.provider) {
    case 'openai':
      return new OpenAIProvider({
        apiKey,
        model: config.ai.model || 'gpt-4',
        timeout: config.ai.timeout,
      });
    case 'anthropic':
      return new AnthropicProvider({
        apiKey,
        model: config.ai.model || 'claude-3-sonnet-20240229',
        timeout: config.ai.timeout,
      });
    default:
      throw new Error(`Unsupported AI provider: ${config.ai.provider}`);
  }
}
```

### Pattern 3: Configuration Middleware

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

export function withConfig(
  handler: (req: NextRequest, config: AppConfig) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const config = getConfig();
    return handler(req, config);
  };
}

// Usage
export const POST = withConfig(async (req, config) => {
  // Config is available here
  if (!config.rateLimit.enabled) {
    // Skip rate limiting
  }
  // ...
});
```

## Troubleshooting Examples

### Issue: Configuration not loading

```typescript
import { validateConfig } from '@/lib/config';

// Debug configuration issues
const result = validateConfig();

console.log('Valid:', result.valid);
console.log('Errors:', result.errors);
console.log('Warnings:', result.warnings);

// Check environment variables
console.log('AI_PROVIDER:', process.env.AI_PROVIDER);
console.log('STORAGE_MODE:', process.env.STORAGE_MODE);
```

### Issue: Secrets not accessible

```typescript
import { getSecretsManager } from '@/lib/config';

const secretsManager = getSecretsManager();

// Check which secrets are configured
console.log('Secrets status:');
console.log('AI_API_KEY:', secretsManager.hasSecret('AI_API_KEY') ? 'configured' : 'missing');
console.log('DATABASE_URL:', secretsManager.hasSecret('DATABASE_URL') ? 'configured' : 'missing');
console.log('JWT_SECRET:', secretsManager.hasSecret('JWT_SECRET') ? 'configured' : 'missing');

// Get masked values for debugging
console.log('Masked secrets:', secretsManager.getMaskedSecrets());
```

### Issue: Validation failing

```bash
# Run validation script with verbose output
npm run validate-config

# Check .env.local file
cat .env.local

# Compare with example
diff .env.local .env.example
```
