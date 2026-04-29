/**
 * Tests for logging middleware
 * Validates: Requirements 1.6
 */

import { NextRequest, NextResponse } from "next/server";
import {
  generateRequestId,
  getClientIP,
  formatLogMessage,
  logRequest,
  createRequestLogData,
  withLogging,
  Logger,
  createLogger,
} from "../logging";

// Mock getConfig
jest.mock("@/lib/config", () => ({
  getConfig: jest.fn(() => ({
    logging: {
      level: "info",
    },
  })),
}));

// Mock console methods
const originalConsole = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

describe("Logging Middleware", () => {
  beforeEach(() => {
    console.debug = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.debug = originalConsole.debug;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  });

  describe("generateRequestId", () => {
    it("should generate unique request IDs", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();

      expect(id1).toBeTruthy();
      expect(id2).toBeTruthy();
      expect(id1).not.toBe(id2);
    });

    it("should generate IDs with correct format", () => {
      const id = generateRequestId();

      expect(id).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe("getClientIP", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "x-forwarded-for": "192.168.1.1, 10.0.0.1",
        },
      });

      const ip = getClientIP(request);

      expect(ip).toBe("192.168.1.1");
    });

    it("should extract IP from x-real-ip header", () => {
      const request = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "x-real-ip": "192.168.1.1",
        },
      });

      const ip = getClientIP(request);

      expect(ip).toBe("192.168.1.1");
    });

    it("should return undefined if no IP headers present", () => {
      const request = new NextRequest("http://localhost:3000/api/test");

      const ip = getClientIP(request);

      expect(ip).toBeUndefined();
    });
  });

  describe("formatLogMessage", () => {
    it("should format log message with level and timestamp", () => {
      const message = formatLogMessage("info", "Test message");
      const parsed = JSON.parse(message);

      expect(parsed.level).toBe("INFO");
      expect(parsed.message).toBe("Test message");
      expect(parsed.timestamp).toBeTruthy();
    });

    it("should include additional data in log message", () => {
      const message = formatLogMessage("info", "Test message", {
        userId: "123",
        action: "test",
      });
      const parsed = JSON.parse(message);

      expect(parsed.userId).toBe("123");
      expect(parsed.action).toBe("test");
    });
  });

  describe("logRequest", () => {
    it("should log at info level", () => {
      logRequest("info", "Test message");

      expect(console.info).toHaveBeenCalled();
    });

    it("should log at error level", () => {
      logRequest("error", "Error message");

      expect(console.error).toHaveBeenCalled();
    });

    it("should not log below configured level", () => {
      logRequest("debug", "Debug message");

      expect(console.debug).not.toHaveBeenCalled();
    });
  });

  describe("createRequestLogData", () => {
    it("should create log data from request", () => {
      const request = new NextRequest("http://localhost:3000/api/test?param=value", {
        method: "POST",
        headers: {
          "user-agent": "Test Agent",
          "x-forwarded-for": "192.168.1.1",
        },
      });

      const logData = createRequestLogData(request, "test-id");

      expect(logData.method).toBe("POST");
      expect(logData.path).toBe("/api/test");
      expect(logData.userAgent).toBe("Test Agent");
      expect(logData.ip).toBe("192.168.1.1");
      expect(logData.requestId).toBe("test-id");
      expect(logData.timestamp).toBeTruthy();
    });
  });

  describe("withLogging", () => {
    it("should log incoming request and outgoing response", async () => {
      const request = new NextRequest("http://localhost:3000/api/test");
      const handler = jest.fn(async () => NextResponse.json({ data: "test" }));

      const result = await withLogging(request, handler);

      expect(handler).toHaveBeenCalled();
      expect(console.info).toHaveBeenCalledTimes(2); // Incoming and outgoing
      expect(result.headers.get("X-Request-ID")).toBeTruthy();
    });

    it("should log errors", async () => {
      const request = new NextRequest("http://localhost:3000/api/test");
      const testError = new Error("Test error");
      const handler = jest.fn(async () => {
        throw testError;
      });

      await expect(withLogging(request, handler)).rejects.toThrow("Test error");

      expect(console.error).toHaveBeenCalled();
    });

    it("should pass request ID to handler", async () => {
      const request = new NextRequest("http://localhost:3000/api/test");
      let capturedRequestId: string | undefined;

      const handler = jest.fn(async (requestId: string) => {
        capturedRequestId = requestId;
        return NextResponse.json({ data: "test" });
      });

      await withLogging(request, handler);

      expect(capturedRequestId).toBeTruthy();
      expect(capturedRequestId).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe("Logger", () => {
    it("should log at different levels", () => {
      const logger = new Logger();

      logger.debug("Debug message");
      logger.info("Info message");
      logger.warn("Warn message");
      logger.error("Error message");

      expect(console.info).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });

    it("should include context in logs", () => {
      const logger = new Logger({ userId: "123", action: "test" });

      logger.info("Test message");

      const logCall = (console.info as jest.Mock).mock.calls[0][0];
      const parsed = JSON.parse(logCall);

      expect(parsed.userId).toBe("123");
      expect(parsed.action).toBe("test");
    });

    it("should create child logger with additional context", () => {
      const logger = new Logger({ userId: "123" });
      const childLogger = logger.child({ action: "test" });

      childLogger.info("Test message");

      const logCall = (console.info as jest.Mock).mock.calls[0][0];
      const parsed = JSON.parse(logCall);

      expect(parsed.userId).toBe("123");
      expect(parsed.action).toBe("test");
    });

    it("should log errors with error details", () => {
      const logger = new Logger();
      const testError = new Error("Test error");

      logger.error("Error occurred", testError);

      const logCall = (console.error as jest.Mock).mock.calls[0][0];
      const parsed = JSON.parse(logCall);

      expect(parsed.error.name).toBe("Error");
      expect(parsed.error.message).toBe("Test error");
      expect(parsed.error.stack).toBeTruthy();
    });
  });

  describe("createLogger", () => {
    it("should create logger with context", () => {
      const logger = createLogger({ userId: "123" });

      logger.info("Test message");

      const logCall = (console.info as jest.Mock).mock.calls[0][0];
      const parsed = JSON.parse(logCall);

      expect(parsed.userId).toBe("123");
    });

    it("should create logger without context", () => {
      const logger = createLogger();

      logger.info("Test message");

      expect(console.info).toHaveBeenCalled();
    });
  });
});
