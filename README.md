# Study-app

Study-app is a Next.js backend (App Router) that provides a small set of study-focused APIs:

- **Notes**: create/list study notes
- **Study Sessions**: create/list/get/update/delete study sessions
- **AI Summarization**: summarize text into key points (with caching + rate limiting)

This project emphasizes **request validation**, **rate limiting**, and **caching** to improve reliability and performance.

---

## Features

### Notes API (`/api/v1/notes`)
- **POST**: create a note (validated with Zod)
- **GET**/**POST (implementation shows list)**: list notes with pagination and optional `subject` filter
- Uses:
  - **Zod** for input validation
  - **In-memory rate limiter** per client identifier (`x-forwarded-for`)
  - **Cache** for list results

### Study Sessions API (`/api/v1/sessions`)
- **POST**: create a study session
- **POST (implementation shows list)**: list sessions with pagination + filters (`subject`, `startDate`, `endDate`)
- **GET** `/api/v1/sessions/[id]`: retrieve a single session
- **PATCH** `/api/v1/sessions/[id]`: update session
- **DELETE** `/api/v1/sessions/[id]`: delete session
- Uses:
  - Zod validation
  - rate limiting
  - storage abstraction (see below)

### AI Summarization (`/api/v1/ai/summarize`)
- **POST**: summarize user text
- Validates input (`text`, optional `options` like `maxKeyPoints` and `temperature`)
- Uses:
  - configurable AI provider (e.g., OpenAI or Anthropic)
  - **token budget management** (via `TokenManager`)
  - **caching** (keyed by input text/options)
  - **rate limiting**

---

## Architecture

### Storage abstraction
The project uses a storage factory to select an adapter based on environment configuration:

- `STORAGE_MODE=database` → `PostgreSQLStorageAdapter`
- default (`local`) → in-memory storage (`InMemoryStorageAdapter`)

Key entry points:
- `getStorageAdapter()` returns a shared adapter instance.

### Caching
- Implemented as an **in-memory cache** with:
  - **TTL expiration**
  - **LRU eviction**
  - hit/miss statistics

### Rate limiting
- Implemented as an **in-memory sliding window** limiter
- Bucket is tracked per client identifier (from `x-forwarded-for` or `anonymous`).

---

## Environment Variables

The code expects (at least) the following variables:

### AI
- `AI_PROVIDER`: `openai` or `anthropic`
- `AI_API_KEY`: API key for the provider
- `AI_MODEL`: model name
- Optional:
  - `AI_MAX_INPUT_TOKENS` (default `4000`)
  - `AI_MAX_OUTPUT_TOKENS_SUMMARY` (default `500`)
  - `AI_MAX_OUTPUT_TOKENS_QUIZ` (default `1000`)
  - `AI_REQUEST_TIMEOUT` (default `15000`)
  - `AI_DAILY_TOKEN_BUDGET` (optional)

### Cache
- `CACHE_ENABLED` (default enabled unless set to `false`)
- `CACHE_TTL` (seconds, default `86400`)
- `CACHE_MAX_ENTRIES` (default `1000`)

### Storage
- `STORAGE_MODE`: `database` to use PostgreSQL, anything else for in-memory
- `DATABASE_URL`: required when `STORAGE_MODE=database`

---

## API Examples

### Create a note
`POST /api/v1/notes`

```json
{
  "title": "Organic Chemistry",
  "content": "Notes content...",
  "subject": "Chemistry",
  "tags": ["chem", "organic"]
}
```

### Summarize text with AI
`POST /api/v1/ai/summarize`

```json
{
  "text": "Paste long text here...",
  "options": {
    "maxKeyPoints": 5,
    "temperature": 0.3
  }
}
```

---

## Error Handling

Endpoints return a consistent JSON shape using `APIResponse` and central error handling via `handleAPIError`.

Common error codes observed:
- `INVALID_INPUT` (Zod validation failures)
- `RATE_LIMIT_EXCEEDED`
- `NOT_FOUND`

---

## Development

Typical workflow:
1. Install dependencies (frontend)
2. Configure environment variables
3. Run the Next.js server

---

## Notes

Some endpoint files shown in the codebase currently expose multiple actions within the same route module. When documenting for consumers, treat them as a set of REST endpoints under `/api/v1/*`.

---

## License

MIT License  

