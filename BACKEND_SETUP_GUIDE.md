# Backend Implementation Setup Guide

## Overview

This document provides step-by-step instructions to complete the backend setup and deploy the Study App with PostgreSQL integration.

## Prerequisites

- Node.js 18+ with pnpm
- PostgreSQL 12+ running locally or accessible via connection string
- OpenAI or Anthropic API key (for AI features)
- Environment configuration file (.env.local)

## Phase 1: Environment Setup

### 1.1 Create Environment Configuration

Create `.env.local` in the `frontend/` directory:

```bash
cp frontend/.env.example frontend/.env.local
```

### 1.2 Configure Environment Variables

Edit `frontend/.env.local` with your settings:

```env
# Required: AI Configuration
AI_PROVIDER=openai                    # or "anthropic"
AI_API_KEY=sk-...                     # Your API key
AI_MODEL=gpt-3.5-turbo                # or claude-3-haiku for Anthropic

# Required: Storage Mode
STORAGE_MODE=database                 # Use "localStorage" for dev, "database" for prod

# Required (if STORAGE_MODE=database): PostgreSQL Connection
DATABASE_URL=postgresql://user:password@localhost:5432/studyapp

# Optional: Cache & Rate Limiting
CACHE_ENABLED=true
CACHE_TTL=86400
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_HOUR=20

# Optional: Logging
LOG_LEVEL=info
```

## Phase 2: PostgreSQL Setup

### 2.1 Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE studyapp;

# Exit
\q
```

### 2.2 Verify Connection

```bash
# Test connection string
psql "postgresql://user:password@localhost:5432/studyapp"

# You should see: studyapp=>
# Exit with: \q
```

### 2.3 Auto-Schema Initialization

The schema initializes automatically on first API call when `PostgreSQLStorageAdapter.initialize()` runs:

- `study_sessions` table with user_id index
- `notes` table with tags array support  
- `user_preferences` table with upsert logic
- `analytics_events` table with JSONB event_data

**No manual schema creation needed!**

## Phase 3: Backend Service Startup

### 3.1 Install Dependencies

```bash
cd frontend
pnpm install
```

### 3.2 Start Development Server

```bash
pnpm dev
```

The API server starts at `http://localhost:3000`

### 3.3 Verify Server Health

```bash
# In a new terminal
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "storage": "database",
    "timestamp": "2024-01-15T12:30:45.000Z"
  }
}
```

## Phase 4: API Endpoint Testing

### 4.1 Test Storage Endpoints

#### Create Session
```bash
curl -X POST http://localhost:3000/api/v1/sessions \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "title": "JavaScript Basics",
    "subject": "Programming",
    "durationMinutes": 60,
    "notes": "Learned ES6 fundamentals"
  }'
```

#### Get Sessions
```bash
curl http://localhost:3000/api/v1/sessions \
  -H "x-user-id: user-123"
```

#### Create Note
```bash
curl -X POST http://localhost:3000/api/v1/notes \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "title": "Note Title",
    "content": "Note content here",
    "subject": "Programming",
    "tags": ["javascript", "es6"]
  }'
```

### 4.2 Test AI Endpoints (requires API key)

#### Summarize Text
```bash
curl -X POST http://localhost:3000/api/v1/ai/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your long text to summarize here...",
    "options": {
      "maxKeyPoints": 5,
      "temperature": 0.7
    }
  }'
```

#### Generate Quiz
```bash
curl -X POST http://localhost:3000/api/v1/ai/generate-quiz \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your study material here...",
    "options": {
      "questionCount": 4,
      "difficulty": "medium"
    }
  }'
```

### 4.3 Test Analytics Endpoints

#### Submit Events
```bash
curl -X POST http://localhost:3000/api/v1/analytics/events \
  -H "Content-Type: application/json" \
  -H "x-user-id: user-123" \
  -d '{
    "events": [
      {
        "type": "session_completed",
        "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
        "sessionId": "session-456",
        "metadata": {"durationMinutes": 45}
      }
    ]
  }'
```

#### Get Analytics Events
```bash
curl http://localhost:3000/api/v1/analytics/events \
  -H "x-user-id: user-123"
```

## Phase 5: Rate Limiting & Caching Verification

### 5.1 Verify Rate Limiting

```bash
# First 20 requests succeed
for i in {1..20}; do
  curl http://localhost:3000/api/v1/sessions \
    -H "x-user-id: test-user" \
    -H "x-forwarded-for: 192.168.1.1"
done

# 21st request returns 429 (Too Many Requests)
curl http://localhost:3000/api/v1/sessions \
  -H "x-user-id: test-user" \
  -H "x-forwarded-for: 192.168.1.1"
```

### 5.2 Verify Caching

```bash
# First request generates cache
time curl http://localhost:3000/api/v1/notes \
  -H "x-user-id: user-123"

# Second request (cached) should be faster
time curl http://localhost:3000/api/v1/notes \
  -H "x-user-id: user-123"

# Check response metadata for "cached": true
```

## Phase 6: Production Deployment

### 6.1 Build Application

```bash
cd frontend
pnpm build
```

### 6.2 Environment Variables for Production

Create `.env.production` with:

```env
NODE_ENV=production
STORAGE_MODE=database
DATABASE_URL=postgresql://prod-user:prod-password@prod-host:5432/studyapp
AI_PROVIDER=openai
AI_API_KEY=sk-prod-...
AI_MODEL=gpt-4
LOG_LEVEL=warn
CACHE_ENABLED=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_HOUR=100
```

### 6.3 Deploy to Vercel / Other Platforms

```bash
# Vercel deployment
vercel --prod --env-file .env.production

# Or use your platform's deployment tool
```

## Phase 7: Monitoring & Maintenance

### 7.1 Database Health Check

```bash
psql "postgresql://user:password@localhost:5432/studyapp" \
  -c "SELECT * FROM pg_stat_user_tables;"
```

### 7.2 Check Cache Statistics

```bash
# Call cache stats endpoint (if implemented)
curl http://localhost:3000/api/v1/admin/cache/stats \
  -H "Authorization: Bearer admin-token"
```

### 7.3 Rate Limit Status

```bash
# Check rate limit status endpoint (if implemented)
curl http://localhost:3000/api/v1/admin/rate-limit/status \
  -H "Authorization: Bearer admin-token"
```

## Troubleshooting

### Database Connection Error

**Problem**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**:
```bash
# Verify PostgreSQL is running
psql -U postgres

# Update DATABASE_URL in .env.local
# Check connection string format
```

### AI API Error

**Problem**: `401 Unauthorized`

**Solution**:
- Verify `AI_API_KEY` is set correctly
- Check API key is valid in OpenAI/Anthropic console
- Ensure `AI_PROVIDER` matches your key's provider

### Rate Limiting Too Strict

**Problem**: Getting 429 errors in normal use

**Solution**:
```env
# Adjust in .env.local
RATE_LIMIT_REQUESTS_PER_HOUR=50  # Increase from 20
```

### Cache Not Working

**Problem**: All requests marked as `"cached": false`

**Solution**:
```env
# Verify cache is enabled
CACHE_ENABLED=true

# Check backend logs for cache errors
LOG_LEVEL=debug
```

## API Response Format Reference

All API responses follow this format:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Example",
    "createdAt": "2024-01-15T12:30:45.000Z",
    "updatedAt": "2024-01-15T12:30:45.000Z"
  },
  "metadata": {
    "cached": false,
    "executionTime": 125,
    "timestamp": "2024-01-15T12:30:45.000Z"
  }
}
```

Error response:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Detailed error message",
    "retryAfter": 3600
  }
}
```

## Next Steps

1. ✅ Configure environment variables
2. ✅ Set up PostgreSQL database
3. ✅ Start development server
4. ✅ Test API endpoints
5. ✅ Verify caching & rate limiting
6. ✅ Deploy to production

## Support

For issues or questions:

1. Check logs: `tail -f frontend/.next/logs/debug.log`
2. Review error codes in [frontend/lib/errors.ts](./lib/errors.ts)
3. Check API types: [frontend/lib/api-types.ts](./lib/api-types.ts)

## Architecture Reference

- **Storage Layer**: `frontend/lib/storage/` (adapter pattern)
- **Cache Layer**: `frontend/lib/cache/cache-manager.ts` (LRU + TTL)
- **Rate Limiting**: `frontend/lib/rate-limit/rate-limiter.ts` (sliding window)
- **API Routes**: `frontend/app/api/v1/` (route handlers)
- **AI Integration**: `frontend/lib/ai/` (provider abstraction)
