/**
 * Example usage of the Pino-based structured logger
 * This file demonstrates how to use the logger in API routes
 */

import { NextRequest, NextResponse } from "next/server";
import {
  logAPIRequest,
  logAIRequest,
  logError,
  logInfo,
  logWarn,
  createChildLogger,
  logCacheAccess,
  logRateLimit,
} from "@/lib/logger";

/**
 * Example 1: Basic API request logging
 */
export async function exampleAPILogging(request: NextRequest) {
  const startTime = Date.now();
  const requestId = "req-123"; // Would come from middleware

  try {
    // Simulate API logic
    const data = { message: "Hello, World!" };

    // Log successful request
    const duration = Date.now() - startTime;
    logAPIRequest("GET", "/api/v1/example", 200, duration, requestId);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    // Log failed request
    const duration = Date.now() - startTime;
    logAPIRequest("GET", "/api/v1/example", 500, duration, requestId);

    // Log error details
    logError(error as Error, { endpoint: "/api/v1/example" }, requestId);

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Example 2: AI request logging with token tracking
 */
export async function exampleAILogging(text: string) {
  const startTime = Date.now();

  try {
    // Simulate AI service call
    const result = {
      summary: "This is a summary",
      keyPoints: ["Point 1", "Point 2"],
      inputTokens: 1000,
      outputTokens: 200,
      cached: false,
    };

    // Log AI request with metrics
    const duration = Date.now() - startTime;
    logAIRequest(
      "summary",
      result.inputTokens,
      result.outputTokens,
      result.cached,
      duration,
      "gpt-4",
      { requestId: "req-456" }
    );

    return result;
  } catch (error) {
    logError(
      error as Error,
      {
        operation: "summarize",
        inputLength: text.length,
      },
      "req-456"
    );
    throw error;
  }
}

/**
 * Example 3: Using child loggers for consistent context
 */
export async function exampleChildLogger(request: NextRequest) {
  // Create a child logger with context
  const logger = createChildLogger({
    endpoint: "/api/v1/ai/summarize",
    requestId: "req-789",
    userId: "user-123",
  });

  logger.info({ message: "Starting summarization request" });

  try {
    // Simulate processing
    const text = await request.text();
    logger.debug({ message: "Input received", length: text.length });

    const result = await exampleAILogging(text);
    logger.info({ message: "Summarization complete", tokens: result.inputTokens + result.outputTokens });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    logger.error({ message: "Summarization failed", error });
    throw error;
  }
}

/**
 * Example 4: Cache access logging
 */
export async function exampleCacheLogging(cacheKey: string) {
  // Check cache
  const cached = null; // Simulate cache miss

  // Log cache access
  logCacheAccess(cacheKey, cached !== null, { requestId: "req-101" });

  if (cached) {
    logInfo("Cache hit", { cacheKey });
    return cached;
  }

  logInfo("Cache miss, fetching fresh data", { cacheKey });
  // Fetch fresh data...
  return null;
}

/**
 * Example 5: Rate limit logging
 */
export async function exampleRateLimitLogging(userId: string) {
  const requestCount = 18;
  const limit = 20;
  const exceeded = requestCount > limit;

  // Log rate limit check
  logRateLimit(userId, exceeded, requestCount, limit, {
    endpoint: "/api/v1/ai/summarize",
  });

  if (exceeded) {
    logWarn("Rate limit exceeded", { userId, requestCount, limit });
    return false;
  }

  return true;
}

/**
 * Example 6: Comprehensive API route with all logging
 */
export async function comprehensiveExample(request: NextRequest) {
  const startTime = Date.now();
  const requestId = "req-999";
  const userId = "user-456";

  // Create child logger for this request
  const logger = createChildLogger({
    endpoint: "/api/v1/ai/summarize",
    requestId,
    userId,
  });

  logger.info({ message: "Request received" });

  try {
    // Check rate limit
    const allowed = await exampleRateLimitLogging(userId);
    if (!allowed) {
      const duration = Date.now() - startTime;
      logAPIRequest("POST", "/api/v1/ai/summarize", 429, duration, requestId);
      return NextResponse.json(
        { success: false, error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    // Check cache
    const cacheKey = "summary-abc123";
    const cached = await exampleCacheLogging(cacheKey);
    if (cached) {
      const duration = Date.now() - startTime;
      logAPIRequest("POST", "/api/v1/ai/summarize", 200, duration, requestId, {
        cached: true,
      });
      return NextResponse.json({ success: true, data: cached });
    }

    // Process request
    const text = await request.text();
    logger.debug({ message: "Processing text", length: text.length });

    const result = await exampleAILogging(text);

    // Log successful request
    const duration = Date.now() - startTime;
    logAPIRequest("POST", "/api/v1/ai/summarize", 200, duration, requestId, {
      cached: false,
      tokens: result.inputTokens + result.outputTokens,
    });

    logger.info({ message: "Request completed successfully" });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    // Log error
    logger.error({ message: "Request failed", error });
    logError(error as Error, { endpoint: "/api/v1/ai/summarize" }, requestId);

    // Log failed request
    const duration = Date.now() - startTime;
    logAPIRequest("POST", "/api/v1/ai/summarize", 500, duration, requestId);

    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
