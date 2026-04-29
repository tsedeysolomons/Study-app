# Smart AI Study Assistant - API Documentation

## Overview

This directory contains the Next.js API routes for the Smart AI Study Assistant backend. The API provides RESTful endpoints for AI services, data persistence, analytics, and user preferences.

## Base URL

All API endpoints are prefixed with `/api/v1`

## API Structure

```
/api/v1/
├── health                    # Health check endpoint
├── ai/
│   ├── summarize            # AI text summarization
│   └── generate-quiz        # AI quiz generation
├── sessions/
│   ├── [GET, POST]          # List/create study sessions
│   └── [id]/
│       └── [DELETE]         # Delete specific session
├── notes/
│   └── [GET, POST]          # Retrieve/save notes
├── analytics/
│   ├── events/              # Submit analytics events
│   │   └── [POST]
│   ├── summary/             # Get analytics summary
│   │   └── [GET]
│   └── data/                # Delete analytics data
│       └── [DELETE]
├── preferences/
│   └── [GET, PUT]           # Get/update user preferences
└── auth/                    # Authentication (database mode only)
    ├── register/
    ├── login/
    ├── refresh/
    └── reset-password/
```

## Endpoint Categories

### AI Endpoints (`/api/v1/ai/*`)

AI-powered features for text summarization and quiz generation.

- **POST /api/v1/ai/summarize** - Generate summary and key points from text
- **POST /api/v1/ai/generate-quiz** - Generate quiz questions from text

### Session Endpoints (`/api/v1/sessions/*`)

Study session management and tracking.

- **GET /api/v1/sessions** - Retrieve study sessions with pagination
- **POST /api/v1/sessions** - Create a new study session
- **DELETE /api/v1/sessions/:id** - Delete a specific study session

### Notes Endpoints (`/api/v1/notes/*`)

Note persistence and retrieval.

- **GET /api/v1/notes** - Retrieve current notes
- **POST /api/v1/notes** - Save or update notes

### Analytics Endpoints (`/api/v1/analytics/*`)

Event tracking and usage analytics.

- **POST /api/v1/analytics/events** - Submit batched analytics events
- **GET /api/v1/analytics/summary** - Get aggregated analytics summary
- **DELETE /api/v1/analytics/data** - Delete user analytics data (privacy compliance)

### Preferences Endpoints (`/api/v1/preferences/*`)

User preferences management.

- **GET /api/v1/preferences** - Get user preferences
- **PUT /api/v1/preferences** - Update user preferences

### Authentication Endpoints (`/api/v1/auth/*`)

User authentication (database mode only).

- **POST /api/v1/auth/register** - Register new user
- **POST /api/v1/auth/login** - User login
- **POST /api/v1/auth/refresh** - Refresh JWT token
- **POST /api/v1/auth/reset-password** - Request password reset

### Health Check (`/api/v1/health`)

System health and status monitoring.

- **GET /api/v1/health** - Get system health status

## Configuration

The API is configured through environment variables. See `.env.example` for all available options.

### Required Configuration

#### For localStorage Mode (Default)
```env
STORAGE_MODE=localStorage
```

#### For Database Mode
```env
STORAGE_MODE=database
DATABASE_URL=postgresql://user:password@localhost:5432/study_assistant
AUTH_REQUIRED=true
JWT_SECRET=your-secret-key-min-32-characters-long
```

#### For AI Services
```env
AI_PROVIDER=openai  # or "anthropic"
AI_API_KEY=your-api-key-here
AI_MODEL=gpt-4  # or "claude-3-sonnet-20240229"
```

### Optional Configuration

- **Rate Limiting**: Control API request frequency
- **Caching**: Enable response caching for AI requests
- **Analytics**: Vercel Analytics integration
- **Monitoring**: Sentry error tracking
- **CORS**: Configure allowed origins

See `.env.example` for complete configuration options.

## Response Format

All API endpoints return JSON responses in a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data specific to the endpoint
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "retryAfter": 60,  // Optional: seconds to wait before retry
    "details": {}      // Optional: additional error details
  }
}
```

## Error Codes

Common error codes returned by the API:

### Client Errors (4xx)
- `INVALID_INPUT` - Request validation failed
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `TOKEN_LIMIT_EXCEEDED` - AI token limit exceeded

### Server Errors (5xx)
- `AI_SERVICE_ERROR` - AI provider error
- `AI_RATE_LIMIT` - AI provider rate limit
- `AI_TIMEOUT` - AI request timeout
- `INVALID_AI_RESPONSE` - Malformed AI response
- `DATABASE_ERROR` - Database operation failed
- `CACHE_ERROR` - Cache operation failed
- `INTERNAL_ERROR` - Unexpected server error
- `SERVICE_UNAVAILABLE` - Service temporarily unavailable
- `TIMEOUT` - Request timeout

## Implementation Status

### ✅ Completed
- API route structure
- TypeScript interfaces and types
- Configuration system with validation
- Health check endpoint
- Error response format

### 🚧 In Progress
- AI service integration (Task 1.2)
- Rate limiting middleware (Task 1.3)
- Response caching (Task 1.4)
- Data persistence layer (Task 1.5)

### 📋 Planned
- Authentication middleware
- Analytics aggregation
- Notification system
- Vercel Analytics integration

## Development

### Running the API

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

### Testing Endpoints

```bash
# Health check
curl http://localhost:3000/api/v1/health

# Test AI summarization (once implemented)
curl -X POST http://localhost:3000/api/v1/ai/summarize \
  -H "Content-Type: application/json" \
  -d '{"text": "Your text here"}'
```

### Adding New Endpoints

1. Create a new route file in the appropriate directory
2. Define request/response types in `/lib/api-types.ts`
3. Implement the route handler with proper error handling
4. Update this README with the new endpoint

## TypeScript Types

All API types are defined in `/lib/api-types.ts`. Import them in your route handlers:

```typescript
import type { APIResponse, SummarizeRequest, SummarizeResponse } from "@/lib/api-types";
```

## Configuration Validation

The configuration system validates all environment variables on startup. If required values are missing or invalid, the application will fail to start with descriptive error messages.

To validate configuration without starting the server:

```typescript
import { validateConfig } from "@/lib/config";

const { valid, errors } = validateConfig();
if (!valid) {
  console.error("Configuration errors:", errors);
}
```

## Next Steps

1. Implement AI service integration (OpenAI/Anthropic)
2. Add rate limiting middleware
3. Implement response caching
4. Add data persistence layer (localStorage proxy or database)
5. Implement authentication for database mode
6. Add comprehensive error handling and logging
7. Write API integration tests

## Resources

- [Next.js API Routes Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference)
- [Zod Validation Library](https://zod.dev/)
