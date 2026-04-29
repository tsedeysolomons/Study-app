/**
 * Health Check Endpoint Tests
 * Tests for /api/v1/health endpoint
 * 
 * Validates Requirement 20.5: Health check endpoint with service status checks
 */

import { NextRequest } from "next/server";
import { GET } from "../route";
import { getConfig } from "@/lib/config";
import * as logger from "@/lib/logger";

// Mock dependencies
jest.mock("@/lib/config");
jest.mock("@/lib/logger");

const mockGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;
const mockLogInfo = logger.logInfo as jest.MockedFunction<typeof logger.logInfo>;
const mockLogError = logger.logError as jest.MockedFunction<typeof logger.logError>;

describe("GET /api/v1/health", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return healthy status when all services are up", async () => {
    // Mock configuration with all services enabled
    mockGetConfig.mockReturnValue({
      nodeEnv: "development",
      storage: {
        mode: "database",
        databaseUrl: "postgresql://localhost:5432/test",
      },
      ai: {
        provider: "openai",
        apiKey: "test-api-key-1234567890",
        model: "gpt-4",
        maxInputTokens: 4000,
        maxOutputTokens: {
          summary: 500,
          quiz: 1000,
        },
        timeout: 15000,
      },
      cache: {
        enabled: true,
        ttl: 86400,
        maxEntries: 1000,
      },
      auth: {
        required: false,
        tokenExpiry: 86400,
      },
      rateLimit: {
        enabled: true,
        requestsPerHour: 20,
      },
      analytics: {
        vercelEnabled: true,
      },
      cors: {
        allowedOrigins: "*",
      },
      logging: {
        level: "info",
      },
      monitoring: {},
    } as any);

    const request = new NextRequest("http://localhost:3000/api/v1/health");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("healthy");
    expect(data.services.api).toBe("up");
    expect(data.services.database).toBe("up");
    expect(data.services.aiService).toBe("up");
    expect(data.services.cache).toBe("up");
    expect(data.timestamp).toBeDefined();
    expect(data.version).toBeDefined();
  });

  it("should return degraded status when one service is down", async () => {
    // Mock configuration with database down
    mockGetConfig.mockReturnValue({
      nodeEnv: "development",
      storage: {
        mode: "database",
        databaseUrl: undefined, // Database URL missing
      },
      ai: {
        provider: "openai",
        apiKey: "test-api-key-1234567890",
        model: "gpt-4",
        maxInputTokens: 4000,
        maxOutputTokens: {
          summary: 500,
          quiz: 1000,
        },
        timeout: 15000,
      },
      cache: {
        enabled: true,
        ttl: 86400,
        maxEntries: 1000,
      },
      auth: {
        required: false,
        tokenExpiry: 86400,
      },
      rateLimit: {
        enabled: true,
        requestsPerHour: 20,
      },
      analytics: {
        vercelEnabled: true,
      },
      cors: {
        allowedOrigins: "*",
      },
      logging: {
        level: "info",
      },
      monitoring: {},
    } as any);

    const request = new NextRequest("http://localhost:3000/api/v1/health");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("degraded");
    expect(data.services.database).toBe("down");
  });

  it("should return unhealthy status when multiple services are down", async () => {
    // Mock configuration with multiple services down
    mockGetConfig.mockReturnValue({
      nodeEnv: "development",
      storage: {
        mode: "database",
        databaseUrl: undefined, // Database URL missing
      },
      ai: {
        provider: undefined, // AI provider not configured
        apiKey: undefined,
        model: undefined,
        maxInputTokens: 4000,
        maxOutputTokens: {
          summary: 500,
          quiz: 1000,
        },
        timeout: 15000,
      },
      cache: {
        enabled: false, // Cache disabled
        ttl: 86400,
        maxEntries: 1000,
      },
      auth: {
        required: false,
        tokenExpiry: 86400,
      },
      rateLimit: {
        enabled: true,
        requestsPerHour: 20,
      },
      analytics: {
        vercelEnabled: true,
      },
      cors: {
        allowedOrigins: "*",
      },
      logging: {
        level: "info",
      },
      monitoring: {},
    } as any);

    const request = new NextRequest("http://localhost:3000/api/v1/health");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("unhealthy");
    expect(data.services.database).toBe("down");
  });

  it("should return not_configured for services that are not enabled", async () => {
    // Mock configuration with localStorage mode (no database)
    mockGetConfig.mockReturnValue({
      nodeEnv: "development",
      storage: {
        mode: "localStorage",
      },
      ai: {
        provider: undefined,
        apiKey: undefined,
        model: undefined,
        maxInputTokens: 4000,
        maxOutputTokens: {
          summary: 500,
          quiz: 1000,
        },
        timeout: 15000,
      },
      cache: {
        enabled: false,
        ttl: 86400,
        maxEntries: 1000,
      },
      auth: {
        required: false,
        tokenExpiry: 86400,
      },
      rateLimit: {
        enabled: true,
        requestsPerHour: 20,
      },
      analytics: {
        vercelEnabled: true,
      },
      cors: {
        allowedOrigins: "*",
      },
      logging: {
        level: "info",
      },
      monitoring: {},
    } as any);

    const request = new NextRequest("http://localhost:3000/api/v1/health");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe("healthy");
    expect(data.services.database).toBe("not_configured");
    expect(data.services.aiService).toBe("not_configured");
    expect(data.services.cache).toBe("not_configured");
  });

  it("should log health check results", async () => {
    mockGetConfig.mockReturnValue({
      nodeEnv: "development",
      storage: {
        mode: "localStorage",
      },
      ai: {
        provider: "openai",
        apiKey: "test-api-key-1234567890",
        model: "gpt-4",
        maxInputTokens: 4000,
        maxOutputTokens: {
          summary: 500,
          quiz: 1000,
        },
        timeout: 15000,
      },
      cache: {
        enabled: true,
        ttl: 86400,
        maxEntries: 1000,
      },
      auth: {
        required: false,
        tokenExpiry: 86400,
      },
      rateLimit: {
        enabled: true,
        requestsPerHour: 20,
      },
      analytics: {
        vercelEnabled: true,
      },
      cors: {
        allowedOrigins: "*",
      },
      logging: {
        level: "info",
      },
      monitoring: {},
    } as any);

    const request = new NextRequest("http://localhost:3000/api/v1/health");
    await GET(request);

    // Verify logging was called
    expect(mockLogInfo).toHaveBeenCalledWith(
      "AI service health check passed",
      expect.objectContaining({
        service: "aiService",
        provider: "openai",
      })
    );
    expect(mockLogInfo).toHaveBeenCalledWith(
      "Cache health check passed",
      expect.objectContaining({
        service: "cache",
      })
    );
  });

  it("should handle configuration errors gracefully", async () => {
    // Mock getConfig to throw an error
    mockGetConfig.mockImplementation(() => {
      throw new Error("Configuration error");
    });

    const request = new NextRequest("http://localhost:3000/api/v1/health");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe("unhealthy");
    expect(mockLogError).toHaveBeenCalled();
  });

  it("should include version information", async () => {
    mockGetConfig.mockReturnValue({
      nodeEnv: "development",
      storage: {
        mode: "localStorage",
      },
      ai: {
        provider: undefined,
        apiKey: undefined,
        model: undefined,
        maxInputTokens: 4000,
        maxOutputTokens: {
          summary: 500,
          quiz: 1000,
        },
        timeout: 15000,
      },
      cache: {
        enabled: false,
        ttl: 86400,
        maxEntries: 1000,
      },
      auth: {
        required: false,
        tokenExpiry: 86400,
      },
      rateLimit: {
        enabled: true,
        requestsPerHour: 20,
      },
      analytics: {
        vercelEnabled: true,
      },
      cors: {
        allowedOrigins: "*",
      },
      logging: {
        level: "info",
      },
      monitoring: {},
    } as any);

    const request = new NextRequest("http://localhost:3000/api/v1/health");
    const response = await GET(request);
    const data = await response.json();

    expect(data.version).toBeDefined();
    expect(typeof data.version).toBe("string");
  });

  it("should include timestamp in ISO format", async () => {
    mockGetConfig.mockReturnValue({
      nodeEnv: "development",
      storage: {
        mode: "localStorage",
      },
      ai: {
        provider: undefined,
        apiKey: undefined,
        model: undefined,
        maxInputTokens: 4000,
        maxOutputTokens: {
          summary: 500,
          quiz: 1000,
        },
        timeout: 15000,
      },
      cache: {
        enabled: false,
        ttl: 86400,
        maxEntries: 1000,
      },
      auth: {
        required: false,
        tokenExpiry: 86400,
      },
      rateLimit: {
        enabled: true,
        requestsPerHour: 20,
      },
      analytics: {
        vercelEnabled: true,
      },
      cors: {
        allowedOrigins: "*",
      },
      logging: {
        level: "info",
      },
      monitoring: {},
    } as any);

    const request = new NextRequest("http://localhost:3000/api/v1/health");
    const response = await GET(request);
    const data = await response.json();

    expect(data.timestamp).toBeDefined();
    expect(() => new Date(data.timestamp)).not.toThrow();
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
