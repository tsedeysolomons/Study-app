# Configuration System

This directory contains the configuration management system for the Smart AI Study Assistant application. The system provides comprehensive validation, secure secrets management, and environment-specific configuration.

## Overview

The configuration system consists of three main components:

1. **env-schema.ts** - Zod schemas for validating environment variables
2. **secrets-manager.ts** - Secure credential handling and masking
3. **config.ts** - Main configuration loader and singleton

## Features

- ✅ **Type-safe configuration** using Zod schemas
- ✅ **Secure secrets management** with automatic masking
- ✅ **Comprehensive validation** with detailed error messages
- ✅ **Cross-field validation** (e.g., database mode requires DATABASE_URL)
- ✅ **Configuration warnings** for potential issues
- ✅ **Pre-deployment validation** script
- ✅ **Safe logging** with masked sensitive values

## Usage

### Basic Usage

```typescript
import { getConfig } from '@/lib/config';

const config = getConfig();

// Access configuration values
console.log(config.ai.provider); // "openai" | "anthropic"
console.log(config.storage.mode); // "localStorage" | "database"
console.log(config.rateLimit.requestsPerHour); // 20
```

### Accessing Secrets Securely

```typescript
import { getSecretsManager } from '@/lib/config';

const secretsManager = getSecretsManager();

// Get a secret (throws if required and missing)
const apiKey = secretsManager.getSecret('AI_API_KEY');

// Check if a secret exists
if (secretsManager.hasSecret('DATABASE_URL')) {
  // Use database
}

// Get masked version for logging
console.log(secretsManager.getMaskedSecret('AI_API_KEY')); // "***xyz"
```

### Validation

```typescript
import { validateConfig } from '@/lib/config';

const result = validateConfig();

if (!result.valid) {
  console.error('Configuration errors:', result.errors);
}

if (result.warnings.length > 0) {
  console.warn('Configuration warnings:', result.warnings);
}
```

## Environment Variables

### Required Variables

None are strictly required for the application to start, but certain features require specific variables:

- **AI Features**: Require `AI_PROVIDER` and `AI_API_KEY`
- **Database Mode**: Requires `DATABASE_URL` when `STORAGE_MODE=database`
- **Authentication**: Requires `JWT_SECRET` when `AUTH_REQUIRED=true`

### All Variables

See `.env.example` in the frontend directory for a complete list of environment variables with descriptions and default values.

## Configuration Schema

### Node Environment
- `NODE_ENV`: "development" | "production" | "test" (default: "development")

### AI Configuration
- `AI_PROVIDER`: "openai" | "anthropic" (optional)
- `AI_API_KEY`: API key (min 20 chars, optional)
- `AI_MODEL`: Model name (optional)
- `AI_MAX_INPUT_TOKENS`: Max input tokens (default: 4000)
- `AI_MAX_OUTPUT_TOKENS_SUMMARY`: Max summary output tokens (default: 500)
- `AI_MAX_OUTPUT_TOKENS_QUIZ`: Max quiz output tokens (default: 1000)
- `AI_REQUEST_TIMEOUT`: Request timeout in ms (default: 15000)

### Storage Configuration
- `STORAGE_MODE`: "localStorage" | "database" (default: "localStorage")
- `DATABASE_URL`: Database connection URL (required if mode=database)

### Authentication Configuration
- `AUTH_REQUIRED`: Enable authentication (default: false)
- `JWT_SECRET`: JWT signing secret (min 32 chars, required if auth enabled)
- `JWT_EXPIRY`: Token expiry in seconds (default: 86400)

### Rate Limiting Configuration
- `RATE_LIMIT_ENABLED`: Enable rate limiting (default: true)
- `RATE_LIMIT_REQUESTS_PER_HOUR`: Requests per hour (default: 20)

### Cache Configuration
- `CACHE_ENABLED`: Enable caching (default: true)
- `CACHE_TTL`: Cache TTL in seconds (default: 86400)
- `CACHE_MAX_ENTRIES`: Max cache entries (default: 1000)

### Analytics Configuration
- `VERCEL_ANALYTICS_ENABLED`: Enable Vercel Analytics (default: true)

### CORS Configuration
- `ALLOWED_ORIGINS`: Allowed origins, comma-separated or "*" (default: "*")

### Logging Configuration
- `LOG_LEVEL`: "debug" | "info" | "warn" | "error" (default: "info")

### Monitoring Configuration
- `SENTRY_DSN`: Sentry DSN URL (optional)

## Validation Rules

### Cross-Field Validation

1. **Database Mode**: When `STORAGE_MODE=database`, `DATABASE_URL` must be provided
2. **Authentication**: When `AUTH_REQUIRED=true`, `JWT_SECRET` must be provided
3. **AI Provider**: When `AI_PROVIDER` is set, `AI_API_KEY` must be provided

### Warnings

The system generates warnings for potentially problematic configurations:

1. Database mode without authentication enabled
2. Debug logging in production
3. CORS allowing all origins in production

## Pre-Deployment Validation

Run the validation script before deploying:

```bash
npm run validate-config
```

This script:
- Validates all environment variables
- Checks secrets meet security requirements
- Verifies cross-field dependencies
- Reports errors and warnings
- Exits with code 0 (success) or 1 (failure)

## Secrets Management

### Registered Secrets

The SecretsManager tracks these secrets:

1. **AI_API_KEY** - AI service API key (min 20 chars)
2. **DATABASE_URL** - Database connection URL (must match pattern)
3. **JWT_SECRET** - JWT signing secret (min 32 chars)
4. **SENTRY_DSN** - Sentry DSN (must be valid URL)

### Security Features

- **Never logged**: Secrets are never exposed in logs or error messages
- **Masked display**: Only last 4 characters shown (e.g., "***xyz")
- **Format validation**: Secrets validated against patterns and length requirements
- **Conditional requirements**: Secrets only required when relevant features are enabled

### Safe Logging

```typescript
import { getConfig, getSecretsManager } from '@/lib/config';

const config = getConfig();
const secretsManager = getSecretsManager();

// Create safe config for logging
const safeConfig = secretsManager.createSafeConfig(config);
console.log(JSON.stringify(safeConfig, null, 2));

// Output:
// {
//   "ai": {
//     "apiKey": "***xyz",
//     ...
//   },
//   "storage": {
//     "databaseUrl": "***",
//     ...
//   }
// }
```

## Testing

### Reset Configuration

For testing, you can reset the configuration singleton:

```typescript
import { resetConfig } from '@/lib/config';

beforeEach(() => {
  resetConfig();
});
```

### Mock Environment Variables

```typescript
const originalEnv = process.env;

beforeEach(() => {
  process.env = {
    ...originalEnv,
    AI_PROVIDER: 'openai',
    AI_API_KEY: 'test-key-1234567890',
    STORAGE_MODE: 'localStorage',
  };
});

afterEach(() => {
  process.env = originalEnv;
});
```

## Error Handling

### Configuration Errors

When configuration is invalid, the application will fail to start with detailed error messages:

```
Configuration validation failed:
  - storage.databaseUrl: DATABASE_URL is required when STORAGE_MODE is 'database'
  - auth.jwtSecret: JWT_SECRET is required when AUTH_REQUIRED is true
```

### Secrets Errors

When secrets are invalid:

```
Secrets validation failed:
  - Required secret 'JWT_SECRET' is missing. Description: Secret key for JWT token signing (required when AUTH_REQUIRED=true)
  - Secret 'AI_API_KEY' must be at least 20 characters long
```

## Best Practices

1. **Never commit secrets**: Use `.env.local` for local development (gitignored)
2. **Use environment-specific files**: `.env.development`, `.env.production`
3. **Validate before deployment**: Run `npm run validate-config`
4. **Review warnings**: Address configuration warnings before production
5. **Rotate secrets regularly**: Update API keys and JWT secrets periodically
6. **Use strong secrets**: JWT secrets should be at least 32 random characters
7. **Restrict CORS**: Set specific allowed origins in production

## Architecture

```
config/
├── env-schema.ts          # Zod schemas and validation logic
├── secrets-manager.ts     # Secure credential handling
└── README.md             # This file

config.ts                 # Main configuration loader (singleton)
```

### Flow

1. Application starts
2. `getConfig()` called
3. Environment variables parsed
4. SecretsManager initialized
5. Configuration validated with Zod
6. Secrets validated conditionally
7. Warnings displayed
8. Configuration cached as singleton
9. Safe config logged (with masked secrets)

## Troubleshooting

### "Invalid configuration" error

Run the validation script to see detailed errors:
```bash
npm run validate-config
```

### "Required secret is missing" error

Check that the required environment variable is set:
```bash
echo $AI_API_KEY
```

### Configuration not updating

The configuration is cached as a singleton. Restart the application or call `resetConfig()` in tests.

### Validation script fails

Ensure `.env.local` exists and contains valid values. See `.env.example` for reference.

## Related Files

- `frontend/.env.example` - Example environment variables
- `frontend/lib/config.ts` - Main configuration module
- `frontend/scripts/validate-config.js` - Validation script
- `frontend/package.json` - npm scripts including `validate-config`
