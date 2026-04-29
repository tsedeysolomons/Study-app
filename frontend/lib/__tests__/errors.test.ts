/**
 * Unit tests for error handling infrastructure
 * 
 * Tests cover:
 * - APIError class functionality
 * - Error code definitions
 * - HTTP status code mapping
 * - Error categorization (temporary vs permanent)
 * - Error handler middleware
 * - Error formatting for display
 */

import { describe, it, expect } from "@jest/globals";
import {
  APIError,
  ErrorCodes,
  getStatusCodeForError,
  isTemporaryError,
  isNonRetryableError,
  handleAPIError,
  formatErrorForDisplay,
} from "../errors";

describe("APIError", () => {
  it("should create an APIError with code and message", () => {
    const error = new APIError("TEST_CODE", "Test message");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(APIError);
    expect(error.name).toBe("APIError");
    expect(error.code).toBe("TEST_CODE");
    expect(error.message).toBe("Test message");
    expect(error.details).toBeUndefined();
  });

  it("should create an APIError with details", () => {
    const details = { retryAfter: 60, extra: "info" };
    const error = new APIError("TEST_CODE", "Test message", details);

    expect(error.code).toBe("TEST_CODE");
    expect(error.message).toBe("Test message");
    expect(error.details).toEqual(details);
  });

  it("should serialize to JSON correctly", () => {
    const error = new APIError("TEST_CODE", "Test message", { key: "value" });
    const json = error.toJSON();

    expect(json).toEqual({
      code: "TEST_CODE",
      message: "Test message",
      details: { key: "value" },
    });
  });

  it("should serialize to JSON without details if not provided", () => {
    const error = new APIError("TEST_CODE", "Test message");
    const json = error.toJSON();

    expect(json).toEqual({
      code: "TEST_CODE",
      message: "Test message",
    });
  });

  it("should identify APIError instances", () => {
    const error = new APIError("TEST_CODE", "Test message");
    expect(APIError.isAPIError(error)).toBe(true);
  });

  it("should identify non-APIError instances", () => {
    const error = new Error("Regular error");
    expect(APIError.isAPIError(error)).toBe(false);
    expect(APIError.isAPIError(null)).toBe(false);
    expect(APIError.isAPIError(undefined)).toBe(false);
    expect(APIError.isAPIError("string")).toBe(false);
  });

  it("should identify objects with APIError name", () => {
    const error = { name: "APIError", code: "TEST", message: "Test" };
    expect(APIError.isAPIError(error)).toBe(true);
  });
});

describe("ErrorCodes", () => {
  it("should define all required error codes", () => {
    expect(ErrorCodes.INVALID_INPUT).toBe("INVALID_INPUT");
    expect(ErrorCodes.MISSING_REQUIRED_FIELD).toBe("MISSING_REQUIRED_FIELD");
    expect(ErrorCodes.INVALID_FORMAT).toBe("INVALID_FORMAT");
    expect(ErrorCodes.TOKEN_LIMIT_EXCEEDED).toBe("TOKEN_LIMIT_EXCEEDED");
    expect(ErrorCodes.UNAUTHORIZED).toBe("UNAUTHORIZED");
    expect(ErrorCodes.INVALID_TOKEN).toBe("INVALID_TOKEN");
    expect(ErrorCodes.TOKEN_EXPIRED).toBe("TOKEN_EXPIRED");
    expect(ErrorCodes.FORBIDDEN).toBe("FORBIDDEN");
    expect(ErrorCodes.NOT_FOUND).toBe("NOT_FOUND");
    expect(ErrorCodes.RATE_LIMIT_EXCEEDED).toBe("RATE_LIMIT_EXCEEDED");
    expect(ErrorCodes.AI_SERVICE_ERROR).toBe("AI_SERVICE_ERROR");
    expect(ErrorCodes.AI_TIMEOUT).toBe("AI_TIMEOUT");
    expect(ErrorCodes.AI_RATE_LIMIT).toBe("AI_RATE_LIMIT");
    expect(ErrorCodes.INVALID_AI_RESPONSE).toBe("INVALID_AI_RESPONSE");
    expect(ErrorCodes.STORAGE_ERROR).toBe("STORAGE_ERROR");
    expect(ErrorCodes.DATABASE_ERROR).toBe("DATABASE_ERROR");
    expect(ErrorCodes.CACHE_ERROR).toBe("CACHE_ERROR");
    expect(ErrorCodes.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
    expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe("SERVICE_UNAVAILABLE");
    expect(ErrorCodes.TIMEOUT).toBe("TIMEOUT");
  });
});

describe("getStatusCodeForError", () => {
  it("should map 400 errors correctly", () => {
    expect(getStatusCodeForError(ErrorCodes.INVALID_INPUT)).toBe(400);
    expect(getStatusCodeForError(ErrorCodes.MISSING_REQUIRED_FIELD)).toBe(400);
    expect(getStatusCodeForError(ErrorCodes.INVALID_FORMAT)).toBe(400);
    expect(getStatusCodeForError(ErrorCodes.TOKEN_LIMIT_EXCEEDED)).toBe(400);
  });

  it("should map 401 errors correctly", () => {
    expect(getStatusCodeForError(ErrorCodes.UNAUTHORIZED)).toBe(401);
    expect(getStatusCodeForError(ErrorCodes.INVALID_TOKEN)).toBe(401);
    expect(getStatusCodeForError(ErrorCodes.TOKEN_EXPIRED)).toBe(401);
  });

  it("should map 403 errors correctly", () => {
    expect(getStatusCodeForError(ErrorCodes.FORBIDDEN)).toBe(403);
  });

  it("should map 404 errors correctly", () => {
    expect(getStatusCodeForError(ErrorCodes.NOT_FOUND)).toBe(404);
  });

  it("should map 429 errors correctly", () => {
    expect(getStatusCodeForError(ErrorCodes.RATE_LIMIT_EXCEEDED)).toBe(429);
    expect(getStatusCodeForError(ErrorCodes.AI_RATE_LIMIT)).toBe(429);
  });

  it("should map 500 errors correctly", () => {
    expect(getStatusCodeForError(ErrorCodes.STORAGE_ERROR)).toBe(500);
    expect(getStatusCodeForError(ErrorCodes.DATABASE_ERROR)).toBe(500);
    expect(getStatusCodeForError(ErrorCodes.CACHE_ERROR)).toBe(500);
    expect(getStatusCodeForError(ErrorCodes.INTERNAL_ERROR)).toBe(500);
  });

  it("should map 502 errors correctly", () => {
    expect(getStatusCodeForError(ErrorCodes.AI_SERVICE_ERROR)).toBe(502);
    expect(getStatusCodeForError(ErrorCodes.INVALID_AI_RESPONSE)).toBe(502);
  });

  it("should map 503 errors correctly", () => {
    expect(getStatusCodeForError(ErrorCodes.SERVICE_UNAVAILABLE)).toBe(503);
  });

  it("should map 504 errors correctly", () => {
    expect(getStatusCodeForError(ErrorCodes.AI_TIMEOUT)).toBe(504);
    expect(getStatusCodeForError(ErrorCodes.TIMEOUT)).toBe(504);
  });

  it("should return 500 for unknown error codes", () => {
    expect(getStatusCodeForError("UNKNOWN_ERROR")).toBe(500);
    expect(getStatusCodeForError("")).toBe(500);
  });
});

describe("isTemporaryError", () => {
  it("should identify temporary errors", () => {
    expect(isTemporaryError(ErrorCodes.AI_TIMEOUT)).toBe(true);
    expect(isTemporaryError(ErrorCodes.TIMEOUT)).toBe(true);
    expect(isTemporaryError(ErrorCodes.SERVICE_UNAVAILABLE)).toBe(true);
    expect(isTemporaryError(ErrorCodes.AI_SERVICE_ERROR)).toBe(true);
    expect(isTemporaryError(ErrorCodes.STORAGE_ERROR)).toBe(true);
    expect(isTemporaryError(ErrorCodes.DATABASE_ERROR)).toBe(true);
    expect(isTemporaryError(ErrorCodes.CACHE_ERROR)).toBe(true);
  });

  it("should identify non-temporary errors", () => {
    expect(isTemporaryError(ErrorCodes.INVALID_INPUT)).toBe(false);
    expect(isTemporaryError(ErrorCodes.UNAUTHORIZED)).toBe(false);
    expect(isTemporaryError(ErrorCodes.RATE_LIMIT_EXCEEDED)).toBe(false);
    expect(isTemporaryError(ErrorCodes.NOT_FOUND)).toBe(false);
  });
});

describe("isNonRetryableError", () => {
  it("should identify non-retryable errors", () => {
    expect(isNonRetryableError(ErrorCodes.INVALID_INPUT)).toBe(true);
    expect(isNonRetryableError(ErrorCodes.MISSING_REQUIRED_FIELD)).toBe(true);
    expect(isNonRetryableError(ErrorCodes.INVALID_FORMAT)).toBe(true);
    expect(isNonRetryableError(ErrorCodes.TOKEN_LIMIT_EXCEEDED)).toBe(true);
    expect(isNonRetryableError(ErrorCodes.UNAUTHORIZED)).toBe(true);
    expect(isNonRetryableError(ErrorCodes.INVALID_TOKEN)).toBe(true);
    expect(isNonRetryableError(ErrorCodes.TOKEN_EXPIRED)).toBe(true);
    expect(isNonRetryableError(ErrorCodes.FORBIDDEN)).toBe(true);
    expect(isNonRetryableError(ErrorCodes.NOT_FOUND)).toBe(true);
    expect(isNonRetryableError(ErrorCodes.INVALID_AI_RESPONSE)).toBe(true);
  });

  it("should identify retryable errors", () => {
    expect(isNonRetryableError(ErrorCodes.AI_TIMEOUT)).toBe(false);
    expect(isNonRetryableError(ErrorCodes.SERVICE_UNAVAILABLE)).toBe(false);
    expect(isNonRetryableError(ErrorCodes.AI_SERVICE_ERROR)).toBe(false);
  });
});

describe("handleAPIError", () => {
  it("should handle APIError instances", () => {
    const error = new APIError("INVALID_INPUT", "Invalid data");
    const result = handleAPIError(error);

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error.code).toBe("INVALID_INPUT");
    expect(result.error.message).toBe("Invalid data");
  });

  it("should handle APIError with retryAfter details", () => {
    const error = new APIError("RATE_LIMIT_EXCEEDED", "Too many requests", {
      retryAfter: 60,
    });
    const result = handleAPIError(error);

    expect(result.success).toBe(false);
    expect(result.status).toBe(429);
    expect(result.error.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(result.error.retryAfter).toBe(60);
  });

  it("should handle validation errors", () => {
    const error = {
      name: "ValidationError",
      message: "Validation failed",
      errors: ["Field is required"],
    };
    const result = handleAPIError(error);

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error.code).toBe("INVALID_INPUT");
    expect(result.error.message).toBe("Validation failed");
    expect(result.error.details).toEqual(["Field is required"]);
  });

  it("should handle Zod errors", () => {
    const error = {
      name: "ZodError",
      issues: [{ path: ["field"], message: "Required" }],
    };
    const result = handleAPIError(error);

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error.code).toBe("INVALID_INPUT");
  });

  it("should handle timeout errors", () => {
    const error = { name: "TimeoutError", message: "Request timed out" };
    const result = handleAPIError(error);

    expect(result.success).toBe(false);
    expect(result.status).toBe(504);
    expect(result.error.code).toBe("TIMEOUT");
  });

  it("should handle network errors", () => {
    const error = { code: "ECONNREFUSED", message: "Connection refused" };
    const result = handleAPIError(error);

    expect(result.success).toBe(false);
    expect(result.status).toBe(503);
    expect(result.error.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("should handle unknown errors", () => {
    const error = new Error("Something went wrong");
    const result = handleAPIError(error);

    expect(result.success).toBe(false);
    expect(result.status).toBe(500);
    expect(result.error.code).toBe("INTERNAL_ERROR");
    expect(result.error.message).toBe("An unexpected error occurred");
  });
});

describe("formatErrorForDisplay", () => {
  it("should format rate limit errors", () => {
    const error = {
      error: {
        code: ErrorCodes.RATE_LIMIT_EXCEEDED,
        message: "Too many requests",
        retryAfter: 120,
      },
    };
    const result = formatErrorForDisplay(error);

    expect(result.title).toBe("Rate Limit Exceeded");
    expect(result.description).toContain("120 seconds");
  });

  it("should format token limit errors", () => {
    const error = {
      error: {
        code: ErrorCodes.TOKEN_LIMIT_EXCEEDED,
        message: "Text too long",
      },
    };
    const result = formatErrorForDisplay(error);

    expect(result.title).toBe("Text Too Long");
    expect(result.description).toContain("shorten");
  });

  it("should format AI timeout errors", () => {
    const error = {
      error: {
        code: ErrorCodes.AI_TIMEOUT,
        message: "Timeout",
      },
    };
    const result = formatErrorForDisplay(error);

    expect(result.title).toBe("Request Timeout");
    expect(result.description).toContain("try again");
  });

  it("should format AI service errors", () => {
    const error = {
      error: {
        code: ErrorCodes.AI_SERVICE_ERROR,
        message: "Service error",
      },
    };
    const result = formatErrorForDisplay(error);

    expect(result.title).toBe("AI Service Error");
    expect(result.description).toContain("temporarily unavailable");
  });

  it("should format unauthorized errors", () => {
    const error = {
      error: {
        code: ErrorCodes.UNAUTHORIZED,
        message: "Not authenticated",
      },
    };
    const result = formatErrorForDisplay(error);

    expect(result.title).toBe("Authentication Required");
    expect(result.description).toContain("log in");
  });

  it("should format invalid input errors", () => {
    const error = {
      error: {
        code: ErrorCodes.INVALID_INPUT,
        message: "Invalid data provided",
      },
    };
    const result = formatErrorForDisplay(error);

    expect(result.title).toBe("Invalid Input");
    expect(result.description).toBe("Invalid data provided");
  });

  it("should format service unavailable errors", () => {
    const error = {
      error: {
        code: ErrorCodes.SERVICE_UNAVAILABLE,
        message: "Service down",
      },
    };
    const result = formatErrorForDisplay(error);

    expect(result.title).toBe("Service Unavailable");
    expect(result.description).toContain("temporarily unavailable");
  });

  it("should handle errors with custom messages", () => {
    const error = {
      error: {
        code: "CUSTOM_ERROR",
        message: "Custom error message",
      },
    };
    const result = formatErrorForDisplay(error);

    expect(result.description).toBe("Custom error message");
  });

  it("should handle errors with just a message property", () => {
    const error = { message: "Simple error" };
    const result = formatErrorForDisplay(error);

    expect(result.description).toBe("Simple error");
  });

  it("should handle unknown error formats", () => {
    const error = {};
    const result = formatErrorForDisplay(error);

    expect(result.title).toBe("Error");
    expect(result.description).toBe("An unexpected error occurred");
  });
});
