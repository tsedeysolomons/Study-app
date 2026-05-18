/**
 * Rate Limiting Middleware
 *
 * Implements rate limiting for API endpoints
 * Requirements: 6.1, 6.2, 15.8
 */

import { NextRequest, NextResponse } from "next/server";
import { getRateLimiter } from "@/lib/rate-limit/rate-limiter";
import type { APIResponse } from "@/lib/api-types";

/**
 * Get identifier for rate limiting (user ID or IP address)
 */
function getIdentifier(request: NextRequest): string {
  // Try to get user ID from auth header (if authentication is implemented)
  const authHeader = request.headers.get("authorization");
  if (authHeader) {
    // Extract user ID from JWT token if present
    // For now, use a simple approach
    const userId = request.headers.get("x-user-id");
    if (userId) {
      return `user:${userId}`;
    }
  }

  // Fall back to IP address
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : request.headers.get("x-real-ip") || "unknown";

  return `ip:${ip}`;
}

/**
 * Rate limiting middleware
 */
export async function withRateLimit(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>,
): Promise<NextResponse> {
  const limiter = getRateLimiter();
  const identifier = getIdentifier(request);

  try {
    // Check rate limit
    const result = limiter.checkLimit(identifier);

    if (!result.allowed) {
      const response: APIResponse = {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests. Please try again later.",
          retryAfter: result.retryAfter,
        },
      };

      return NextResponse.json(response, {
        status: 429,
        headers: {
          "X-RateLimit-Limit": "20",
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
          "Retry-After": result.retryAfter?.toString() || "3600",
        },
      });
    }

    // Execute handler
    const response = await handler(request);

    // Add rate limit headers to response
    response.headers.set("X-RateLimit-Limit", "20");
    response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
    response.headers.set(
      "X-RateLimit-Reset",
      new Date(result.resetAt).toISOString(),
    );

    return response;
  } catch (error) {
    // If rate limiting fails, allow the request but log the error
    console.error("Rate limiting error:", error);
    return handler(request);
  }
}

/**
 * Higher-order function to wrap route handlers with rate limiting
 */
export function rateLimited(
  handler: (request: NextRequest) => Promise<NextResponse>,
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    return withRateLimit(request, handler);
  };
}
