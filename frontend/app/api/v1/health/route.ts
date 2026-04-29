import { NextResponse } from "next/server";

/**
 * Health check endpoint
 * GET /api/v1/health
 */
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      api: "up",
      database: "not_configured",
      aiService: "not_configured",
      cache: "not_configured",
    },
    version: "1.0.0",
  });
}
