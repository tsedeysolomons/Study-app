/**
 * Structured logging infrastructure with Pino
 * Implements Requirements 1.6, 20.2, 20.3
 * 
 * This module provides structured logging with Pino for better performance
 * and features compared to basic console logging. It includes:
 * - Structured JSON logging
 * - Configurable log levels
 * - Pretty printing in development
 * - Specialized log functions for API requests, AI requests, and errors
 */

import pino from "pino";
import { getConfig } from "@/lib/config";

/**
 * Initialize Pino logger with environment-specific configuration
 */
function createPinoLogger() {
  const config = getConfig();
  const isDevelopment = config.nodeEnv === "development";

  return pino({
    level: config.logging.level,
    // Use pino-pretty for human-readable logs in development
    transport: isDevelopment
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
          },
        }
      : undefined,
    // Base fields included in all logs
    base: {
      env: config.nodeEnv,
    },
    // Timestamp format
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

// Singleton logger instance
let loggerInstance: pino.Logger | null = null;

/**
 * Get the Pino logger instance
 * Creates the logger on first call, returns cached instance on subsequent calls
 */
export function getLogger(): pino.Logger {
  if (!loggerInstance) {
    loggerInstance = createPinoLogger();
  }
  return loggerInstance;
}

/**
 * Reset logger instance (useful for testing)
 */
export function resetLogger(): void {
  loggerInstance = null;
}

/**
 * Log API request with structured data
 * Implements Requirement 1.6: Log all requests for debugging and monitoring
 * 
 * @param method - HTTP method (GET, POST, etc.)
 * @param path - Request path
 * @param status - HTTP status code
 * @param duration - Request duration in milliseconds
 * @param requestId - Optional request ID for correlation
 * @param metadata - Additional metadata to include in the log
 */
export function logAPIRequest(
  method: string,
  path: string,
  status: number,
  duration: number,
  requestId?: string,
  metadata?: Record<string, any>
): void {
  const logger = getLogger();

  logger.info({
    type: "api_request",
    method,
    path,
    status,
    duration,
    requestId,
    ...metadata,
  });
}

/**
 * Log AI service request with token usage and performance metrics
 * Implements Requirement 20.4: Track AI service response times and token usage
 * 
 * @param requestType - Type of AI request ('summary' or 'quiz')
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param cached - Whether the response was served from cache
 * @param duration - Request duration in milliseconds
 * @param model - AI model used
 * @param metadata - Additional metadata to include in the log
 */
export function logAIRequest(
  requestType: "summary" | "quiz",
  inputTokens: number,
  outputTokens: number,
  cached: boolean,
  duration: number,
  model: string,
  metadata?: Record<string, any>
): void {
  const logger = getLogger();

  logger.info({
    type: "ai_request",
    requestType,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    cached,
    duration,
    model,
    ...metadata,
  });
}

/**
 * Log error with stack trace and context information
 * Implements Requirement 20.2: Log all errors with stack traces and context information
 * 
 * @param error - Error object or error message
 * @param context - Additional context information
 * @param requestId - Optional request ID for correlation
 */
export function logError(
  error: Error | string,
  context?: Record<string, any>,
  requestId?: string
): void {
  const logger = getLogger();

  if (error instanceof Error) {
    logger.error({
      type: "error",
      message: error.message,
      stack: error.stack,
      name: error.name,
      requestId,
      ...context,
    });
  } else {
    logger.error({
      type: "error",
      message: error,
      requestId,
      ...context,
    });
  }
}

/**
 * Log informational message
 * 
 * @param message - Log message
 * @param data - Additional structured data
 */
export function logInfo(message: string, data?: Record<string, any>): void {
  const logger = getLogger();
  logger.info({ message, ...data });
}

/**
 * Log warning message
 * 
 * @param message - Warning message
 * @param data - Additional structured data
 */
export function logWarn(message: string, data?: Record<string, any>): void {
  const logger = getLogger();
  logger.warn({ message, ...data });
}

/**
 * Log debug message
 * 
 * @param message - Debug message
 * @param data - Additional structured data
 */
export function logDebug(message: string, data?: Record<string, any>): void {
  const logger = getLogger();
  logger.debug({ message, ...data });
}

/**
 * Create a child logger with additional context
 * Useful for adding consistent context to all logs in a specific scope
 * 
 * @param context - Context to add to all logs from this child logger
 * @returns Child logger instance
 * 
 * @example
 * const logger = createChildLogger({ userId: '123', endpoint: '/api/v1/ai/summarize' });
 * logger.info({ message: 'Processing request' });
 * // Logs will include userId and endpoint in all messages
 */
export function createChildLogger(context: Record<string, any>): pino.Logger {
  const logger = getLogger();
  return logger.child(context);
}

/**
 * Log cache hit/miss for performance monitoring
 * Implements Requirement 20.8: Track cache hit rates for performance optimization
 * 
 * @param cacheKey - Cache key
 * @param hit - Whether it was a cache hit or miss
 * @param metadata - Additional metadata
 */
export function logCacheAccess(
  cacheKey: string,
  hit: boolean,
  metadata?: Record<string, any>
): void {
  const logger = getLogger();

  logger.debug({
    type: "cache_access",
    cacheKey,
    hit,
    ...metadata,
  });
}

/**
 * Log rate limit event
 * 
 * @param identifier - User ID or IP address
 * @param exceeded - Whether the rate limit was exceeded
 * @param requestCount - Current request count
 * @param limit - Rate limit threshold
 * @param metadata - Additional metadata
 */
export function logRateLimit(
  identifier: string,
  exceeded: boolean,
  requestCount: number,
  limit: number,
  metadata?: Record<string, any>
): void {
  const logger = getLogger();

  logger.warn({
    type: "rate_limit",
    identifier,
    exceeded,
    requestCount,
    limit,
    ...metadata,
  });
}

/**
 * Log database operation
 * 
 * @param operation - Database operation type (query, insert, update, delete)
 * @param table - Table name
 * @param duration - Operation duration in milliseconds
 * @param metadata - Additional metadata
 */
export function logDatabaseOperation(
  operation: string,
  table: string,
  duration: number,
  metadata?: Record<string, any>
): void {
  const logger = getLogger();

  logger.debug({
    type: "database_operation",
    operation,
    table,
    duration,
    ...metadata,
  });
}

/**
 * Log analytics event
 * 
 * @param eventType - Type of analytics event
 * @param userId - User ID (optional)
 * @param sessionId - Session ID
 * @param metadata - Additional event metadata
 */
export function logAnalyticsEvent(
  eventType: string,
  userId: string | undefined,
  sessionId: string,
  metadata?: Record<string, any>
): void {
  const logger = getLogger();

  logger.debug({
    type: "analytics_event",
    eventType,
    userId,
    sessionId,
    ...metadata,
  });
}

/**
 * Log authentication event
 * 
 * @param event - Authentication event type (login, logout, register, etc.)
 * @param userId - User ID (optional)
 * @param success - Whether the authentication was successful
 * @param metadata - Additional metadata
 */
export function logAuthEvent(
  event: string,
  userId: string | undefined,
  success: boolean,
  metadata?: Record<string, any>
): void {
  const logger = getLogger();

  logger.info({
    type: "auth_event",
    event,
    userId,
    success,
    ...metadata,
  });
}

/**
 * Export the base logger for advanced use cases
 */
export { pino };
export type Logger = pino.Logger;
