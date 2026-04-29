/**
 * Tests for CORS middleware
 * Validates: Requirements 1.3
 */

import { NextRequest, NextResponse } from "next/server";
import {
  applyCORSHeaders,
  handleCORSPreflight,
  withCORS,
  isOriginAllowed,
} from "../cors";

// Mock getConfig
jest.mock("@/lib/config", () => ({
  getConfig: jest.fn(() => ({
    cors: {
      allowedOrigins: "*",
    },
  })),
}));

describe("CORS Middleware", () => {
  describe("applyCORSHeaders", () => {
    it("should apply CORS headers for wildcard origin", () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          origin: "http://example.com",
        },
      });
      const response = NextResponse.json({ data: "test" });

      const result = applyCORSHeaders(request, response);

      expect(result.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(result.headers.get("Access-Control-Allow-Credentials")).toBe("true");
      expect(result.headers.get("Access-Control-Allow-Methods")).toContain("GET");
      expect(result.headers.get("Access-Control-Allow-Headers")).toContain("Content-Type");
    });

    it("should apply CORS headers for specific allowed origin", () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          origin: "http://example.com",
        },
      });
      const response = NextResponse.json({ data: "test" });

      const result = applyCORSHeaders(request, response, {
        allowedOrigins: ["http://example.com"],
      });

      expect(result.headers.get("Access-Control-Allow-Origin")).toBe("http://example.com");
    });

    it("should not apply CORS headers for disallowed origin", () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          origin: "http://malicious.com",
        },
      });
      const response = NextResponse.json({ data: "test" });

      const result = applyCORSHeaders(request, response, {
        allowedOrigins: ["http://example.com"],
      });

      expect(result.headers.get("Access-Control-Allow-Origin")).toBeNull();
    });

    it("should apply custom CORS options", () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          origin: "http://example.com",
        },
      });
      const response = NextResponse.json({ data: "test" });

      const result = applyCORSHeaders(request, response, {
        allowedOrigins: "*",
        allowedMethods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        exposedHeaders: ["X-Custom-Header"],
        maxAge: 3600,
      });

      expect(result.headers.get("Access-Control-Allow-Methods")).toBe("GET, POST");
      expect(result.headers.get("Access-Control-Allow-Headers")).toBe("Content-Type");
      expect(result.headers.get("Access-Control-Expose-Headers")).toBe("X-Custom-Header");
      expect(result.headers.get("Access-Control-Max-Age")).toBe("3600");
    });
  });

  describe("handleCORSPreflight", () => {
    it("should handle OPTIONS preflight request", () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "OPTIONS",
        headers: {
          origin: "http://example.com",
        },
      });

      const result = handleCORSPreflight(request);

      expect(result).not.toBeNull();
      expect(result?.status).toBe(204);
      expect(result?.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("should return null for non-OPTIONS requests", () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
        headers: {
          origin: "http://example.com",
        },
      });

      const result = handleCORSPreflight(request);

      expect(result).toBeNull();
    });
  });

  describe("withCORS", () => {
    it("should handle preflight and return 204", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "OPTIONS",
        headers: {
          origin: "http://example.com",
        },
      });

      const handler = jest.fn(async () => NextResponse.json({ data: "test" }));

      const result = await withCORS(request, handler);

      expect(result.status).toBe(204);
      expect(handler).not.toHaveBeenCalled();
    });

    it("should apply CORS headers to handler response", async () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        method: "GET",
        headers: {
          origin: "http://example.com",
        },
      });

      const handler = jest.fn(async () => NextResponse.json({ data: "test" }));

      const result = await withCORS(request, handler);

      expect(handler).toHaveBeenCalled();
      expect(result.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });

  describe("isOriginAllowed", () => {
    it("should allow wildcard origin", () => {
      expect(isOriginAllowed("http://example.com", "*")).toBe(true);
      expect(isOriginAllowed("http://any-domain.com", "*")).toBe(true);
    });

    it("should allow specific origins", () => {
      expect(isOriginAllowed("http://example.com", ["http://example.com"])).toBe(true);
      expect(isOriginAllowed("http://other.com", ["http://example.com"])).toBe(false);
    });

    it("should handle comma-separated string origins", () => {
      expect(isOriginAllowed("http://example.com", "http://example.com,http://other.com")).toBe(true);
      expect(isOriginAllowed("http://third.com", "http://example.com,http://other.com")).toBe(false);
    });

    it("should return false for null origin", () => {
      expect(isOriginAllowed(null, "*")).toBe(false);
      expect(isOriginAllowed(null, ["http://example.com"])).toBe(false);
    });
  });
});
