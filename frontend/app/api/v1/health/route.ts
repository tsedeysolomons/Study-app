import { NextRequest, NextResponse } from "next/server";
import { withMiddleware } from "@/lib/middleware";
import { getConfig } from "@/lib/config";
import { logInfo, logError } from "@/lib/logger";

/**
 * Health check endpoint
 * GET /api/v1/health
 * 
 * Implements Requirement 20.5: Health check endpoint with service status checks
 * Returns structured health status response for monitoring and deployment verification
 */
export async function GET(request: NextRequest) {
  return withMiddleware(request, async () => {
    const checks = {
      api: "up" as "up" | "down",
      database: "not_configured" as "up" | "down" | "not_configured",
      aiService: "not_configured" as "up" | "down" | "not_configured",
      cache: "not_configured" as "up" | "down" | "not_configured",
    };

    let status: "healthy" | "degraded" | "unhealthy" = "healthy";

    try {
      const config = getConfig();

      // Check database status
      if (config.storage.mode === "database") {
        try {
          // TODO: Implement actual database health check when database is implemented
          // For now, check if database URL is configured
          if (config.storage.databaseUrl) {
            checks.database = "up";
            logInfo("Database health check passed", { service: "database" });
          } else {
            checks.database = "down";
            status = "degraded";
            logError("Database configured but URL missing", { service: "database" });
          }
        } catch (error) {
          checks.database = "down";
          status = "degraded";
          logError(
            error instanceof Error ? error : new Error("Database health check failed"),
            { service: "database" }
          );
        }
      }

      // Check AI service status
      if (config.ai.provider && config.ai.apiKey) {
        try {
          // AI service is configured - mark as up
          // Actual connectivity check would require making a test API call
          // which would incur costs, so we just verify configuration
          checks.aiService = "up";
          logInfo("AI service health check passed", {
            service: "aiService",
            provider: config.ai.provider,
          });
        } catch (error) {
          checks.aiService = "down";
          status = "degraded";
          logError(
            error instanceof Error ? error : new Error("AI service health check failed"),
            { service: "aiService" }
          );
        }
      } else {
        // AI service not configured
        checks.aiService = "not_configured";
      }

      // Check cache status
      if (config.cache.enabled) {
        try {
          // Cache is enabled - mark as up
          // In-memory cache doesn't require connectivity check
          checks.cache = "up";
          logInfo("Cache health check passed", { service: "cache" });
        } catch (error) {
          checks.cache = "down";
          status = "degraded";
          logError(
            error instanceof Error ? error : new Error("Cache health check failed"),
            { service: "cache" }
          );
        }
      } else {
        // Cache is disabled
        checks.cache = "not_configured";
      }

      // Determine overall status
      const downServices = Object.values(checks).filter((s) => s === "down").length;
      if (downServices > 0) {
        status = downServices >= 2 ? "unhealthy" : "degraded";
      }
    } catch (error) {
      // Configuration error - mark as unhealthy
      status = "unhealthy";
      logError(
        error instanceof Error ? error : new Error("Health check configuration error"),
        { service: "health-check" }
      );
    }

    const statusCode = status === "healthy" ? 200 : status === "degraded" ? 200 : 503;

    return NextResponse.json(
      {
        status,
        timestamp: new Date().toISOString(),
        services: checks,
        version: process.env.npm_package_version || "1.0.0",
      },
      { status: statusCode }
    );
  });
}
