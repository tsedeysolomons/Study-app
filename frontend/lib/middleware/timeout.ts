import { NextRequest, NextResponse } from "next/server";
import { ErrorCodes } from "@/lib/errors";

/**
 * Request timeout handling middleware
 * Implements Requirement 1.7: Request timeout handling to prevent hanging connections
 */

export interface TimeoutOptions {
  timeoutMs?: number;
  onTimeout?: (request: NextRequest) => void;
}

/**
 * Default timeout for API requests (30 seconds)
 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Wrap a handler with timeout protection
 * If the handler takes longer than the specified timeout, returns a timeout error
 * 
 * Usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   return withTimeout(request, async () => {
 *     // Your route handler logic
 *     return NextResponse.json({ data: "..." });
 *   }, { timeoutMs: 15000 });
 * }
 * ```
 */
export async function withTimeout(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  options?: TimeoutOptions
): Promise<NextResponse> {
  const timeoutMs = options?.timeoutMs || DEFAULT_TIMEOUT_MS;

  // Create a timeout promise
  const timeoutPromise = new Promise<NextResponse>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    // Race between the handler and the timeout
    const response = await Promise.race([handler(), timeoutPromise]);
    return response;
  } catch (error) {
    if (error instanceof TimeoutError) {
      // Call timeout callback if provided
      if (options?.onTimeout) {
        options.onTimeout(request);
      }

      // Log timeout
      console.error("Request timeout:", {
        method: request.method,
        url: request.url,
        timeoutMs,
        timestamp: new Date().toISOString(),
      });

      // Return timeout error response
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ErrorCodes.TIMEOUT,
            message: "Request timed out",
            details: {
              timeoutMs,
              url: request.url,
              method: request.method,
            },
          },
        },
        { status: 504 }
      );
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Custom timeout error class
 */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

/**
 * Create an AbortController with timeout
 * Useful for fetch requests and other abortable operations
 * 
 * Usage:
 * ```typescript
 * const { signal, cleanup } = createTimeoutSignal(5000);
 * try {
 *   const response = await fetch(url, { signal });
 *   return response;
 * } finally {
 *   cleanup();
 * }
 * ```
 */
export function createTimeoutSignal(timeoutMs: number): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}

/**
 * Wrap a promise with timeout
 * Generic utility for adding timeout to any promise
 */
export async function withPromiseTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(
        new TimeoutError(
          errorMessage || `Operation timeout after ${timeoutMs}ms`
        )
      );
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}
