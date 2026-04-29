import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";

/**
 * Request logging middleware
 * Implements Requirement 1.6: Log all requests and errors for debugging and monitoring
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface RequestLogData {
  method: string;
  url: string;
  path: string;
  timestamp: string;
  userAgent?: string;
  ip?: string;
  requestId?: string;
  duration?: number;
  status?: number;
  error?: any;
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract client IP from request
 */
export function getClientIP(request: NextRequest): string | undefined {
  // Try various headers that might contain the client IP
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return undefined;
}

/**
 * Format log message with structured data
 */
export function formatLogMessage(
  level: LogLevel,
  message: string,
  data?: Record<string, any>
): string {
  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...data,
  };

  return JSON.stringify(logData);
}

/**
 * Log request with appropriate level
 */
export function logRequest(
  level: LogLevel,
  message: string,
  data?: RequestLogData
): void {
  const config = getConfig();
  const configLevel = config.logging.level;

  // Check if this log level should be output
  const levels: LogLevel[] = ["debug", "info", "warn", "error"];
  const configLevelIndex = levels.indexOf(configLevel);
  const currentLevelIndex = levels.indexOf(level);

  if (currentLevelIndex < configLevelIndex) {
    return; // Skip logging if below configured level
  }

  const formattedMessage = formatLogMessage(level, message, data);

  switch (level) {
    case "debug":
      console.debug(formattedMessage);
      break;
    case "info":
      console.info(formattedMessage);
      break;
    case "warn":
      console.warn(formattedMessage);
      break;
    case "error":
      console.error(formattedMessage);
      break;
  }
}

/**
 * Create request log data from NextRequest
 */
export function createRequestLogData(
  request: NextRequest,
  requestId?: string
): RequestLogData {
  const url = new URL(request.url);

  return {
    method: request.method,
    url: request.url,
    path: url.pathname,
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get("user-agent") || undefined,
    ip: getClientIP(request),
    requestId: requestId || generateRequestId(),
  };
}

/**
 * Log incoming request
 */
export function logIncomingRequest(
  request: NextRequest,
  requestId: string
): void {
  const logData = createRequestLogData(request, requestId);
  logRequest("info", "Incoming request", logData);
}

/**
 * Log outgoing response
 */
export function logOutgoingResponse(
  request: NextRequest,
  response: NextResponse,
  requestId: string,
  startTime: number
): void {
  const duration = Date.now() - startTime;
  const logData = createRequestLogData(request, requestId);

  logRequest("info", "Outgoing response", {
    ...logData,
    status: response.status,
    duration,
  });
}

/**
 * Log error
 */
export function logError(
  request: NextRequest,
  error: any,
  requestId: string
): void {
  const logData = createRequestLogData(request, requestId);

  logRequest("error", "Request error", {
    ...logData,
    error: {
      name: error?.name,
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
    },
  });
}

/**
 * Request logging middleware wrapper
 * Logs incoming requests, outgoing responses, and errors
 * 
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   return withLogging(request, async (requestId) => {
 *     // Your route handler logic
 *     // requestId is available for correlation
 *     return NextResponse.json({ data: "..." });
 *   });
 * }
 * ```
 */
export async function withLogging(
  request: NextRequest,
  handler: (requestId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Log incoming request
  logIncomingRequest(request, requestId);

  try {
    // Execute handler
    const response = await handler(requestId);

    // Add request ID to response headers for tracing
    response.headers.set("X-Request-ID", requestId);

    // Log outgoing response
    logOutgoingResponse(request, response, requestId, startTime);

    return response;
  } catch (error) {
    // Log error
    logError(request, error, requestId);

    // Re-throw to be handled by error handler
    throw error;
  }
}

/**
 * Structured logger class for more advanced logging
 */
export class Logger {
  private context: Record<string, any>;

  constructor(context?: Record<string, any>) {
    this.context = context || {};
  }

  debug(message: string, data?: Record<string, any>): void {
    logRequest("debug", message, { ...this.context, ...data });
  }

  info(message: string, data?: Record<string, any>): void {
    logRequest("info", message, { ...this.context, ...data });
  }

  warn(message: string, data?: Record<string, any>): void {
    logRequest("warn", message, { ...this.context, ...data });
  }

  error(message: string, error?: any, data?: Record<string, any>): void {
    logRequest("error", message, {
      ...this.context,
      ...data,
      error: error
        ? {
            name: error?.name,
            message: error?.message,
            stack: error?.stack,
            code: error?.code,
          }
        : undefined,
    });
  }

  child(additionalContext: Record<string, any>): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }
}

/**
 * Create a logger instance with context
 */
export function createLogger(context?: Record<string, any>): Logger {
  return new Logger(context);
}
