/**
 * Tests for Pino-based structured logging
 * Validates: Requirements 1.6, 20.2, 20.3, 20.4, 20.8
 */

import pino from "pino";
import {
  getLogger,
  resetLogger,
  logAPIRequest,
  logAIRequest,
  logError,
  logInfo,
  logWarn,
  logDebug,
  createChildLogger,
  logCacheAccess,
  logRateLimit,
  logDatabaseOperation,
  logAnalyticsEvent,
  logAuthEvent,
} from "../logger";

// Mock getConfig
jest.mock("@/lib/config", () => ({
  getConfig: jest.fn(() => ({
    nodeEnv: "test",
    logging: {
      level: "debug",
    },
  })),
}));

// Mock pino
jest.mock("pino", () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(),
  };

  const pinoMock = jest.fn(() => mockLogger);
  pinoMock.stdTimeFunctions = {
    isoTime: jest.fn(),
  };

  return pinoMock;
});

describe("Pino Logger", () => {
  let mockLogger: any;

  beforeEach(() => {
    resetLogger();
    mockLogger = pino();
    mockLogger.child.mockReturnValue(mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getLogger", () => {
    it("should create and return a logger instance", () => {
      const logger = getLogger();

      expect(logger).toBeDefined();
      expect(pino).toHaveBeenCalled();
    });

    it("should return the same instance on subsequent calls", () => {
      const logger1 = getLogger();
      const logger2 = getLogger();

      expect(logger1).toBe(logger2);
      expect(pino).toHaveBeenCalledTimes(1);
    });

    it("should configure logger with correct log level", () => {
      getLogger();

      expect(pino).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "debug",
        })
      );
    });

    it("should configure logger with base fields", () => {
      getLogger();

      expect(pino).toHaveBeenCalledWith(
        expect.objectContaining({
          base: {
            env: "test",
          },
        })
      );
    });
  });

  describe("resetLogger", () => {
    it("should reset logger instance", () => {
      getLogger();
      resetLogger();
      getLogger();

      expect(pino).toHaveBeenCalledTimes(2);
    });
  });

  describe("logAPIRequest", () => {
    it("should log API request with all required fields", () => {
      logAPIRequest("GET", "/api/v1/test", 200, 150, "req-123");

      expect(mockLogger.info).toHaveBeenCalledWith({
        type: "api_request",
        method: "GET",
        path: "/api/v1/test",
        status: 200,
        duration: 150,
        requestId: "req-123",
      });
    });

    it("should log API request without optional fields", () => {
      logAPIRequest("POST", "/api/v1/notes", 201, 250);

      expect(mockLogger.info).toHaveBeenCalledWith({
        type: "api_request",
        method: "POST",
        path: "/api/v1/notes",
        status: 201,
        duration: 250,
        requestId: undefined,
      });
    });

    it("should include additional metadata", () => {
      logAPIRequest("GET", "/api/v1/test", 200, 150, "req-123", {
        userId: "user-456",
        cached: true,
      });

      expect(mockLogger.info).toHaveBeenCalledWith({
        type: "api_request",
        method: "GET",
        path: "/api/v1/test",
        status: 200,
        duration: 150,
        requestId: "req-123",
        userId: "user-456",
        cached: true,
      });
    });
  });

  describe("logAIRequest", () => {
    it("should log AI request with all required fields", () => {
      logAIRequest("summary", 1000, 200, false, 2500, "gpt-4");

      expect(mockLogger.info).toHaveBeenCalledWith({
        type: "ai_request",
        requestType: "summary",
        inputTokens: 1000,
        outputTokens: 200,
        totalTokens: 1200,
        cached: false,
        duration: 2500,
        model: "gpt-4",
      });
    });

    it("should log cached AI request", () => {
      logAIRequest("quiz", 1500, 300, true, 50, "claude-3-sonnet");

      expect(mockLogger.info).toHaveBeenCalledWith({
        type: "ai_request",
        requestType: "quiz",
        inputTokens: 1500,
        outputTokens: 300,
        totalTokens: 1800,
        cached: true,
        duration: 50,
        model: "claude-3-sonnet",
      });
    });

    it("should include additional metadata", () => {
      logAIRequest("summary", 1000, 200, false, 2500, "gpt-4", {
        userId: "user-123",
        requestId: "req-456",
      });

      expect(mockLogger.info).toHaveBeenCalledWith({
        type: "ai_request",
        requestType: "summary",
        inputTokens: 1000,
        outputTokens: 200,
        totalTokens: 1200,
        cached: false,
        duration: 2500,
        model: "gpt-4",
        userId: "user-123",
        requestId: "req-456",
      });
    });
  });

  describe("logError", () => {
    it("should log Error object with stack trace", () => {
      const error = new Error("Test error");
      error.name = "TestError";

      logError(error, { userId: "user-123" }, "req-456");

      expect(mockLogger.error).toHaveBeenCalledWith({
        type: "error",
        message: "Test error",
        stack: error.stack,
        name: "TestError",
        requestId: "req-456",
        userId: "user-123",
      });
    });

    it("should log string error message", () => {
      logError("Something went wrong", { action: "test" }, "req-789");

      expect(mockLogger.error).toHaveBeenCalledWith({
        type: "error",
        message: "Something went wrong",
        requestId: "req-789",
        action: "test",
      });
    });

    it("should log error without context or requestId", () => {
      const error = new Error("Simple error");

      logError(error);

      expect(mockLogger.error).toHaveBeenCalledWith({
        type: "error",
        message: "Simple error",
        stack: error.stack,
        name: "Error",
        requestId: undefined,
      });
    });
  });

  describe("logInfo", () => {
    it("should log info message", () => {
      logInfo("Test info message");

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: "Test info message",
      });
    });

    it("should log info message with data", () => {
      logInfo("Test info message", { userId: "123", action: "test" });

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: "Test info message",
        userId: "123",
        action: "test",
      });
    });
  });

  describe("logWarn", () => {
    it("should log warning message", () => {
      logWarn("Test warning");

      expect(mockLogger.warn).toHaveBeenCalledWith({
        message: "Test warning",
      });
    });

    it("should log warning with data", () => {
      logWarn("Test warning", { threshold: 100, current: 95 });

      expect(mockLogger.warn).toHaveBeenCalledWith({
        message: "Test warning",
        threshold: 100,
        current: 95,
      });
    });
  });

  describe("logDebug", () => {
    it("should log debug message", () => {
      logDebug("Test debug message");

      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: "Test debug message",
      });
    });

    it("should log debug message with data", () => {
      logDebug("Test debug message", { step: 1, value: "test" });

      expect(mockLogger.debug).toHaveBeenCalledWith({
        message: "Test debug message",
        step: 1,
        value: "test",
      });
    });
  });

  describe("createChildLogger", () => {
    it("should create child logger with context", () => {
      const childLogger = createChildLogger({ userId: "123", endpoint: "/api/test" });

      expect(mockLogger.child).toHaveBeenCalledWith({
        userId: "123",
        endpoint: "/api/test",
      });
      expect(childLogger).toBeDefined();
    });

    it("should allow child logger to log messages", () => {
      const childLogger = createChildLogger({ userId: "123" });
      childLogger.info({ message: "Test message" });

      expect(mockLogger.info).toHaveBeenCalledWith({
        message: "Test message",
      });
    });
  });

  describe("logCacheAccess", () => {
    it("should log cache hit", () => {
      logCacheAccess("cache-key-123", true);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        type: "cache_access",
        cacheKey: "cache-key-123",
        hit: true,
      });
    });

    it("should log cache miss", () => {
      logCacheAccess("cache-key-456", false, { requestId: "req-789" });

      expect(mockLogger.debug).toHaveBeenCalledWith({
        type: "cache_access",
        cacheKey: "cache-key-456",
        hit: false,
        requestId: "req-789",
      });
    });
  });

  describe("logRateLimit", () => {
    it("should log rate limit not exceeded", () => {
      logRateLimit("user-123", false, 15, 20);

      expect(mockLogger.warn).toHaveBeenCalledWith({
        type: "rate_limit",
        identifier: "user-123",
        exceeded: false,
        requestCount: 15,
        limit: 20,
      });
    });

    it("should log rate limit exceeded", () => {
      logRateLimit("192.168.1.1", true, 21, 20, { endpoint: "/api/v1/ai/summarize" });

      expect(mockLogger.warn).toHaveBeenCalledWith({
        type: "rate_limit",
        identifier: "192.168.1.1",
        exceeded: true,
        requestCount: 21,
        limit: 20,
        endpoint: "/api/v1/ai/summarize",
      });
    });
  });

  describe("logDatabaseOperation", () => {
    it("should log database query", () => {
      logDatabaseOperation("query", "users", 45);

      expect(mockLogger.debug).toHaveBeenCalledWith({
        type: "database_operation",
        operation: "query",
        table: "users",
        duration: 45,
      });
    });

    it("should log database insert with metadata", () => {
      logDatabaseOperation("insert", "study_sessions", 120, {
        rowsAffected: 1,
        userId: "user-123",
      });

      expect(mockLogger.debug).toHaveBeenCalledWith({
        type: "database_operation",
        operation: "insert",
        table: "study_sessions",
        duration: 120,
        rowsAffected: 1,
        userId: "user-123",
      });
    });
  });

  describe("logAnalyticsEvent", () => {
    it("should log analytics event with user", () => {
      logAnalyticsEvent("note_saved", "user-123", "session-456");

      expect(mockLogger.debug).toHaveBeenCalledWith({
        type: "analytics_event",
        eventType: "note_saved",
        userId: "user-123",
        sessionId: "session-456",
      });
    });

    it("should log analytics event without user", () => {
      logAnalyticsEvent("quiz_completed", undefined, "session-789", {
        score: 85,
        questionsCount: 5,
      });

      expect(mockLogger.debug).toHaveBeenCalledWith({
        type: "analytics_event",
        eventType: "quiz_completed",
        userId: undefined,
        sessionId: "session-789",
        score: 85,
        questionsCount: 5,
      });
    });
  });

  describe("logAuthEvent", () => {
    it("should log successful authentication", () => {
      logAuthEvent("login", "user-123", true);

      expect(mockLogger.info).toHaveBeenCalledWith({
        type: "auth_event",
        event: "login",
        userId: "user-123",
        success: true,
      });
    });

    it("should log failed authentication", () => {
      logAuthEvent("login", undefined, false, {
        reason: "invalid_credentials",
        ip: "192.168.1.1",
      });

      expect(mockLogger.info).toHaveBeenCalledWith({
        type: "auth_event",
        event: "login",
        userId: undefined,
        success: false,
        reason: "invalid_credentials",
        ip: "192.168.1.1",
      });
    });

    it("should log registration event", () => {
      logAuthEvent("register", "user-456", true, {
        email: "test@example.com",
      });

      expect(mockLogger.info).toHaveBeenCalledWith({
        type: "auth_event",
        event: "register",
        userId: "user-456",
        success: true,
        email: "test@example.com",
      });
    });
  });
});
