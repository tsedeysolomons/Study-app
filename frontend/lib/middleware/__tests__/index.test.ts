/**
 * Tests for combined middleware
 * Validates: Requirements 1.3, 1.6, 1.7
 */

import { NextRequest, NextResponse } from "next/server";
import {
  withMiddleware,
  withCORSOnly,
  withTimeoutOnly,
  withLoggingOnly,
} from "../index";

// Mock getConfig
jest.mock("@/lib/config", () => ({
  getConfig: jest.fn(() => ({
    cors: {
      allowedOrigins: "*",
    },
    logging: {
      level: "info",
    },
  })),
}));

// Mock console methods
const originalConsole = {
  info: console.info,
  error: console.error,
};

describe("Combined Middleware", () => {
  beforeEach(() => {
    console.info = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.info = originalConsole.info;
    console.error = originalConsole.error;
  });

  describe("withMiddleware", () => {
    it("should apply all middleware by default", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          origin: "http://example.com",
        },
      });
      const handler = jest.fn(async () => NextResponse.json({ data: "test" }));

      const result = await withMiddleware(request, handler);

      expect(handler).toHaveBeenCalled();
      expect(result.status).toBe(200);
      // Check CORS headers
      expect(result.headers.get("Access-Control-Allow-Origin")).toBe("*");
      // Check logging (request ID header)
      expect(result.headers.get("X-Request-ID")).toBeTruthy();
      // Check logging was called
      expect(console.info).toHaveBeenCalled();
    });

    it("should handle OPTIONS preflight request", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "OPTIONS",
        headers: {
          origin: "http://example.com",
        },
      });
      const handler = jest.fn(async () => NextResponse.json({ data: "test" }));

      const result = await withMiddleware(request, handler);

      expect(result.status).toBe(204);
      expect(handler).not.toHaveBeenCalled();
    });

    it("should apply custom CORS options", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          origin: "http://example.com",
        },
      });
      const handler = jest.fn(async () => NextResponse.json({ data: "test" }));

      const result = await withMiddleware(request, handler, {
        cors: {
          allowedOrigins: ["http://example.com"],
          allowedMethods: ["GET", "POST"],
        },
      });

      expect(result.headers.get("Access-Control-Allow-Origin")).toBe("http://example.com");
      expect(result.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST");
    });

    it("should apply custom timeout", async () => {
      const request = new NextRequest("http://localhost:3000/api/test");
      const handler = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return NextResponse.json({ data: "test" });
      });

      const result = await withMiddleware(request, handler, {
        timeout: { timeoutMs: 100 },
      });

      expect(result.status).toBe(504);
      const body = await result.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("TIMEOUT");
    });

    it("should disable specific middleware", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          origin: "http://example.com",
        },
      });
      const handler = jest.fn(async () => NextResponse.json({ data: "test" }));

      const result = await withMiddleware(request, handler, {
        cors: false,
        logging: false,
      });

      expect(handler).toHaveBeenCalled();
      // No CORS headers
      expect(result.headers.get("Access-Control-Allow-Origin")).toBeNull();
      // No request ID
      expect(result.headers.get("X-Request-ID")).toBeNull();
    });

    it("should handle errors with error handler", async () => {
      const request = new NextRequest("http://localhost:3000/api/test");
      const handler = jest.fn(async () => {
        throw new Error("Test error");
      });

      const result = await withMiddleware(request, handler);

      expect(result.status).toBe(500);
      const body = await result.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeTruthy();
    });
  });

  describe("withCORSOnly", () => {
    it("should apply only CORS middleware", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          origin: "http://example.com",
        },
      });
      const handler = jest.fn(async () => NextResponse.json({ data: "test" }));

      const result = await withCORSOnly(request, handler);

      expect(handler).toHaveBeenCalled();
      // CORS headers present
      expect(result.headers.get("Access-Control-Allow-Origin")).toBe("*");
      // No request ID (logging disabled)
      expect(result.headers.get("X-Request-ID")).toBeNull();
    });
  });

  describe("withTimeoutOnly", () => {
    it("should apply only timeout middleware", async () => {
      const request = new NextRequest("http://localhost:3000/api/test");
      const handler = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return NextResponse.json({ data: "test" });
      });

      const result = await withTimeoutOnly(request, handler, { timeoutMs: 100 });

      expect(result.status).toBe(504);
      // No CORS headers
      expect(result.headers.get("Access-Control-Allow-Origin")).toBeNull();
      // No request ID
      expect(result.headers.get("X-Request-ID")).toBeNull();
    });
  });

  describe("withLoggingOnly", () => {
    it("should apply only logging middleware", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          origin: "http://example.com",
        },
      });
      const handler = jest.fn(async () => NextResponse.json({ data: "test" }));

      const result = await withLoggingOnly(request, handler);

      expect(handler).toHaveBeenCalled();
      // Request ID present (logging enabled)
      expect(result.headers.get("X-Request-ID")).toBeTruthy();
      // No CORS headers
      expect(result.headers.get("Access-Control-Allow-Origin")).toBeNull();
      // Logging was called
      expect(console.info).toHaveBeenCalled();
    });
  });
});
