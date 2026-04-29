/**
 * Error handling infrastructure for the Smart AI Study Assistant
 * 
 * This module provides:
 * - APIError class for structured error handling
 * - Error codes for consistent error identification
 * - HTTP status code mapping
 * - Error serialization for API responses
 * 
 * **Validates: Requirements 1.5, 15.1, 15.2, 15.3, 15.6**
 */

/**
 * Custom error class for API errors with structured error codes
 * 
 * @example
 * throw new APIError("INVALID_INPUT", "Text cannot be empty");
 * throw new APIError("RATE_LIMIT_EXCEEDED", "Too many requests", { retryAfter: 60 });
 */
export class APIError extends Error {
  public readonly code: string;
  public readonly details?: any;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = "APIError";
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }

  /**
   * Serializes the error to a JSON-compatible object for API responses
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.details && { details: this.details }),
    };
  }

  /**
   * Checks if an error is an APIError instance
   */
  static isAPIError(error: any): error is APIError {
    return error instanceof APIError || error?.name === "APIError";
  }
}

/**
 * Standard error codes used throughout the application
 * 
 * Organized by category:
 * - Input Validation (4xx)
 * - Authentication (401)
 * - Rate Limiting (429)
 * - AI Service (5xx)
 * - Storage (5xx)
 * - Server (5xx)
 */
export const ErrorCodes = {
  // Input Validation (400)
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INVALID_FORMAT: "INVALID_FORMAT",
  TOKEN_LIMIT_EXCEEDED: "TOKEN_LIMIT_EXCEEDED",

  // Authentication (401)
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",

  // Authorization (403)
  FORBIDDEN: "FORBIDDEN",

  // Not Found (404)
  NOT_FOUND: "NOT_FOUND",

  // Rate Limiting (429)
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",

  // AI Service (502/504)
  AI_SERVICE_ERROR: "AI_SERVICE_ERROR",
  AI_TIMEOUT: "AI_TIMEOUT",
  AI_RATE_LIMIT: "AI_RATE_LIMIT",
  INVALID_AI_RESPONSE: "INVALID_AI_RESPONSE",

  // Storage (500)
  STORAGE_ERROR: "STORAGE_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  CACHE_ERROR: "CACHE_ERROR",

  // Server (500/503/504)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  TIMEOUT: "TIMEOUT",
} as const;

/**
 * Type for error codes
 */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Maps error codes to HTTP status codes
 * 
 * @param code - The error code to map
 * @returns The corresponding HTTP status code
 */
export function getStatusCodeForError(code: string): number {
  const statusMap: Record<string, number> = {
    // 400 - Bad Request
    [ErrorCodes.INVALID_INPUT]: 400,
    [ErrorCodes.MISSING_REQUIRED_FIELD]: 400,
    [ErrorCodes.INVALID_FORMAT]: 400,
    [ErrorCodes.TOKEN_LIMIT_EXCEEDED]: 400,

    // 401 - Unauthorized
    [ErrorCodes.UNAUTHORIZED]: 401,
    [ErrorCodes.INVALID_TOKEN]: 401,
    [ErrorCodes.TOKEN_EXPIRED]: 401,

    // 403 - Forbidden
    [ErrorCodes.FORBIDDEN]: 403,

    // 404 - Not Found
    [ErrorCodes.NOT_FOUND]: 404,

    // 429 - Too Many Requests
    [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
    [ErrorCodes.AI_RATE_LIMIT]: 429,

    // 500 - Internal Server Error
    [ErrorCodes.STORAGE_ERROR]: 500,
    [ErrorCodes.DATABASE_ERROR]: 500,
    [ErrorCodes.CACHE_ERROR]: 500,
    [ErrorCodes.INTERNAL_ERROR]: 500,

    // 502 - Bad Gateway
    [ErrorCodes.AI_SERVICE_ERROR]: 502,
    [ErrorCodes.INVALID_AI_RESPONSE]: 502,

    // 503 - Service Unavailable
    [ErrorCodes.SERVICE_UNAVAILABLE]: 503,

    // 504 - Gateway Timeout
    [ErrorCodes.AI_TIMEOUT]: 504,
    [ErrorCodes.TIMEOUT]: 504,
  };

  return statusMap[code] || 500;
}

/**
 * Categorizes errors as temporary (retryable) or permanent
 * 
 * @param code - The error code to categorize
 * @returns true if the error is temporary and can be retried
 */
export function isTemporaryError(code: string): boolean {
  const temporaryErrors = [
    ErrorCodes.AI_TIMEOUT,
    ErrorCodes.TIMEOUT,
    ErrorCodes.SERVICE_UNAVAILABLE,
    ErrorCodes.AI_SERVICE_ERROR,
    ErrorCodes.STORAGE_ERROR,
    ErrorCodes.DATABASE_ERROR,
    ErrorCodes.CACHE_ERROR,
  ];

  return temporaryErrors.includes(code as ErrorCode);
}

/**
 * Categorizes errors as non-retryable (permanent)
 * 
 * @param code - The error code to categorize
 * @returns true if the error should not be retried
 */
export function isNonRetryableError(code: string): boolean {
  const nonRetryableErrors = [
    ErrorCodes.INVALID_INPUT,
    ErrorCodes.MISSING_REQUIRED_FIELD,
    ErrorCodes.INVALID_FORMAT,
    ErrorCodes.TOKEN_LIMIT_EXCEEDED,
    ErrorCodes.UNAUTHORIZED,
    ErrorCodes.INVALID_TOKEN,
    ErrorCodes.TOKEN_EXPIRED,
    ErrorCodes.FORBIDDEN,
    ErrorCodes.NOT_FOUND,
    ErrorCodes.INVALID_AI_RESPONSE,
  ];

  return nonRetryableErrors.includes(code as ErrorCode);
}

/**
 * Error handler middleware for Next.js API routes
 * 
 * @param error - The error to handle
 * @returns A structured error response object
 * 
 * @example
 * try {
 *   // API logic
 * } catch (error) {
 *   const errorResponse = handleAPIError(error);
 *   return NextResponse.json(errorResponse, { status: errorResponse.status });
 * }
 */
export function handleAPIError(error: any): {
  success: false;
  error: {
    code: string;
    message: string;
    retryAfter?: number;
    details?: any;
  };
  status: number;
} {
  // Log error for debugging (in production, this would go to a logging service)
  console.error("API Error:", {
    name: error?.name,
    message: error?.message,
    code: error?.code,
    stack: process.env.NODE_ENV === "development" ? error?.stack : undefined,
  });

  // Handle known API errors
  if (APIError.isAPIError(error)) {
    const statusCode = getStatusCodeForError(error.code);
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.details?.retryAfter && {
          retryAfter: error.details.retryAfter,
        }),
        ...(error.details && { details: error.details }),
      },
      status: statusCode,
    };
  }

  // Handle validation errors (e.g., from Zod)
  if (error?.name === "ValidationError" || error?.name === "ZodError") {
    return {
      success: false,
      error: {
        code: ErrorCodes.INVALID_INPUT,
        message: "Validation failed",
        details: error.errors || error.issues || error.message,
      },
      status: 400,
    };
  }

  // Handle timeout errors
  if (error?.name === "TimeoutError" || error?.code === "ETIMEDOUT") {
    return {
      success: false,
      error: {
        code: ErrorCodes.TIMEOUT,
        message: "Request timed out",
      },
      status: 504,
    };
  }

  // Handle network errors
  if (error?.code === "ECONNREFUSED" || error?.code === "ENOTFOUND") {
    return {
      success: false,
      error: {
        code: ErrorCodes.SERVICE_UNAVAILABLE,
        message: "Service temporarily unavailable",
      },
      status: 503,
    };
  }

  // Handle unknown errors
  return {
    success: false,
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: "An unexpected error occurred",
      details:
        process.env.NODE_ENV === "development" ? error?.message : undefined,
    },
    status: 500,
  };
}

/**
 * Creates a user-friendly error message for display in the UI
 * 
 * @param error - The error to format
 * @returns An object with title and description for display
 */
export function formatErrorForDisplay(error: any): {
  title: string;
  description: string;
} {
  let title = "Error";
  let description = "An unexpected error occurred";

  if (error?.error) {
    // API error response
    const apiError = error.error;

    switch (apiError.code) {
      case ErrorCodes.RATE_LIMIT_EXCEEDED:
        title = "Rate Limit Exceeded";
        description = `Too many requests. Please try again in ${apiError.retryAfter || 60} seconds.`;
        break;
      case ErrorCodes.TOKEN_LIMIT_EXCEEDED:
        title = "Text Too Long";
        description = "Please shorten your text and try again.";
        break;
      case ErrorCodes.AI_TIMEOUT:
        title = "Request Timeout";
        description =
          "The AI service took too long to respond. Please try again.";
        break;
      case ErrorCodes.AI_SERVICE_ERROR:
        title = "AI Service Error";
        description =
          "The AI service is temporarily unavailable. Please try again later.";
        break;
      case ErrorCodes.UNAUTHORIZED:
        title = "Authentication Required";
        description = "Please log in to continue.";
        break;
      case ErrorCodes.INVALID_INPUT:
        title = "Invalid Input";
        description = apiError.message || "Please check your input and try again.";
        break;
      case ErrorCodes.SERVICE_UNAVAILABLE:
        title = "Service Unavailable";
        description = "The service is temporarily unavailable. Please try again later.";
        break;
      default:
        description = apiError.message || description;
    }
  } else if (error?.message) {
    description = error.message;
  }

  return { title, description };
}
