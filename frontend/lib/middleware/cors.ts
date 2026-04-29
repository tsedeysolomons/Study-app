import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";

/**
 * CORS middleware with configurable allowed origins
 * Implements Requirement 1.3: CORS policies for frontend domain
 */

export interface CORSOptions {
  allowedOrigins?: string | string[];
  allowedMethods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

/**
 * Apply CORS headers to a response
 */
export function applyCORSHeaders(
  request: NextRequest,
  response: NextResponse,
  options?: CORSOptions
): NextResponse {
  const config = getConfig();
  const origin = request.headers.get("origin");

  // Parse allowed origins from config
  const allowedOrigins = options?.allowedOrigins || config.cors.allowedOrigins;
  const originsArray = typeof allowedOrigins === "string"
    ? allowedOrigins.split(",").map(o => o.trim())
    : allowedOrigins;

  // Check if origin is allowed
  const isAllowed = originsArray.includes("*") || 
    (origin && originsArray.includes(origin));

  if (isAllowed) {
    // Set CORS headers
    if (originsArray.includes("*")) {
      response.headers.set("Access-Control-Allow-Origin", "*");
    } else if (origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }

    // Set credentials header if specified
    if (options?.credentials !== false) {
      response.headers.set("Access-Control-Allow-Credentials", "true");
    }

    // Set allowed methods
    const methods = options?.allowedMethods || [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
    ];
    response.headers.set("Access-Control-Allow-Methods", methods.join(", "));

    // Set allowed headers
    const headers = options?.allowedHeaders || [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ];
    response.headers.set("Access-Control-Allow-Headers", headers.join(", "));

    // Set exposed headers if specified
    if (options?.exposedHeaders && options.exposedHeaders.length > 0) {
      response.headers.set(
        "Access-Control-Expose-Headers",
        options.exposedHeaders.join(", ")
      );
    }

    // Set max age for preflight cache
    const maxAge = options?.maxAge || 86400; // 24 hours default
    response.headers.set("Access-Control-Max-Age", maxAge.toString());
  }

  return response;
}

/**
 * Handle CORS preflight requests (OPTIONS)
 */
export function handleCORSPreflight(
  request: NextRequest,
  options?: CORSOptions
): NextResponse | null {
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    return applyCORSHeaders(request, response, options);
  }
  return null;
}

/**
 * CORS middleware wrapper for API routes
 * Usage:
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   return withCORS(request, async () => {
 *     // Your route handler logic
 *     return NextResponse.json({ data: "..." });
 *   });
 * }
 * ```
 */
export async function withCORS(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  options?: CORSOptions
): Promise<NextResponse> {
  // Handle preflight requests
  const preflightResponse = handleCORSPreflight(request, options);
  if (preflightResponse) {
    return preflightResponse;
  }

  // Execute the handler
  const response = await handler();

  // Apply CORS headers to the response
  return applyCORSHeaders(request, response, options);
}

/**
 * Validate origin against allowed origins
 */
export function isOriginAllowed(
  origin: string | null,
  allowedOrigins: string | string[]
): boolean {
  if (!origin) return false;

  const originsArray = typeof allowedOrigins === "string"
    ? allowedOrigins.split(",").map(o => o.trim())
    : allowedOrigins;

  return originsArray.includes("*") || originsArray.includes(origin);
}
