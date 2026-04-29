import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/middleware";

/**
 * Example API route demonstrating middleware usage
 * GET /api/v1/middleware-example
 * 
 * This route demonstrates:
 * - CORS handling (including preflight)
 * - Request timeout protection
 * - Request/response logging
 * - Error handling
 */
export async function GET(request: NextRequest) {
  return withMiddleware(
    request,
    async () => {
      // Simulate some processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      return NextResponse.json({
        success: true,
        message: "Middleware example route",
        features: {
          cors: "Enabled with configurable origins",
          timeout: "30 second default timeout",
          logging: "Structured request/response logging",
        },
        timestamp: new Date().toISOString(),
      });
    },
    {
      // Custom middleware options (optional)
      cors: {
        allowedOrigins: "*", // Configure based on environment
        allowedMethods: ["GET", "POST", "OPTIONS"],
      },
      timeout: {
        timeoutMs: 5000, // 5 second timeout for this route
      },
      logging: true,
    }
  );
}

/**
 * POST endpoint demonstrating error handling
 */
export async function POST(request: NextRequest) {
  return withMiddleware(request, async () => {
    const body = await request.json();

    // Simulate validation
    if (!body.data) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Missing required field: data",
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data received",
      data: body.data,
    });
  });
}
