/**
 * Middleware exports and combined middleware utilities
 * Provides easy-to-use middleware composition for API routes
 */

export * from "./cors";
export * from "./timeout";
export * from "./logging";

import { NextRequest, NextResponse } from "next/server";
import { withCORS, CORSOptions } from "./cors";
import { withTimeout, TimeoutOptions } from "./timeout";
import { withLogging } from "./logging";
import { handleAPIError } from "@/lib/errors";

/**
 * Combined middleware options
 */
export interface MiddlewareOptions {
  cors?: CORSOptions | boolean;
  timeout?: TimeoutOptions | boolean;
  logging?: boolean;
}

/**
 * Apply all middleware to a route handler
 * Combines CORS, timeout, and logging middleware in the correct order
 * 
 * Order of execution:
 * 1. Logging (start) - logs incoming request
 * 2. CORS - handles preflight and applies headers
 * 3. Timeout - wraps handler with timeout protection
 * 4. Handler - your route logic
 * 5. Logging (end) - logs outgoing response
 * 
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   return withMiddleware(request, async () => {
 *     // Your route handler logic
 *     return NextResponse.json({ data: "..." });
 *   });
 * }
 * 
 * // With custom options
 * export async function POST(request: NextRequest) {
 *   return withMiddleware(
 *     request,
 *     async () => {
 *       // Your route handler logic
 *       return NextResponse.json({ data: "..." });
 *     },
 *     {
 *       cors: { allowedOrigins: ["https://example.com"] },
 *       timeout: { timeoutMs: 15000 },
 *       logging: true,
 *     }
 *   );
 * }
 * ```
 */
export async function withMiddleware(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  options?: MiddlewareOptions
): Promise<NextResponse> {
  const {
    cors = true,
    timeout = true,
    logging = true,
  } = options || {};

  try {
    // Apply logging middleware (if enabled)
    if (logging) {
      return await withLogging(request, async (requestId) => {
        // Apply CORS middleware (if enabled)
        const corsHandler = cors
          ? () =>
              withCORS(
                request,
                handler,
                typeof cors === "object" ? cors : undefined
              )
          : handler;

        // Apply timeout middleware (if enabled)
        if (timeout) {
          return await withTimeout(
            request,
            corsHandler,
            typeof timeout === "object" ? timeout : undefined
          );
        }

        return await corsHandler();
      });
    }

    // Without logging, apply CORS and timeout directly
    const corsHandler = cors
      ? () =>
          withCORS(
            request,
            handler,
            typeof cors === "object" ? cors : undefined
          )
      : handler;

    if (timeout) {
      return await withTimeout(
        request,
        corsHandler,
        typeof timeout === "object" ? timeout : undefined
      );
    }

    return await corsHandler();
  } catch (error) {
    // Handle errors with the error handler
    const errorResponse = handleAPIError(error);
    return NextResponse.json(
      {
        success: errorResponse.success,
        error: errorResponse.error,
      },
      { status: errorResponse.status }
    );
  }
}

/**
 * Simplified middleware for routes that only need CORS
 */
export async function withCORSOnly(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  options?: CORSOptions
): Promise<NextResponse> {
  return withMiddleware(request, handler, {
    cors: options || true,
    timeout: false,
    logging: false,
  });
}

/**
 * Simplified middleware for routes that only need timeout
 */
export async function withTimeoutOnly(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  options?: TimeoutOptions
): Promise<NextResponse> {
  return withMiddleware(request, handler, {
    cors: false,
    timeout: options || true,
    logging: false,
  });
}

/**
 * Simplified middleware for routes that only need logging
 */
export async function withLoggingOnly(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  return withMiddleware(request, handler, {
    cors: false,
    timeout: false,
    logging: true,
  });
}
