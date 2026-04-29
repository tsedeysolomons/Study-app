/**
 * Retry handler with exponential backoff for transient failures
 * 
 * This module provides retry logic for operations that may fail temporarily,
 * such as network requests, AI service calls, and database operations.
 * 
 * **Validates: Requirements 15.1, 15.2, 15.3**
 */

import { APIError, ErrorCodes, isNonRetryableError } from "./errors";

/**
 * Options for retry behavior
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts (default: 1)
   */
  maxRetries?: number;

  /**
   * Backoff strategy: "linear" or "exponential" (default: "exponential")
   */
  backoff?: "linear" | "exponential";

  /**
   * Initial delay in milliseconds before first retry (default: 1000)
   */
  initialDelay?: number;

  /**
   * Maximum delay in milliseconds between retries (default: 10000)
   */
  maxDelay?: number;

  /**
   * Optional callback invoked before each retry attempt
   */
  onRetry?: (attempt: number, error: any, delay: number) => void;

  /**
   * Custom function to determine if an error should be retried
   * If not provided, uses default logic based on error codes
   */
  shouldRetry?: (error: any) => boolean;
}

/**
 * Result of a retry operation
 */
export interface RetryResult<T> {
  /**
   * The successful result
   */
  value: T;

  /**
   * Number of attempts made (1 = success on first try)
   */
  attempts: number;

  /**
   * Total time spent including delays (milliseconds)
   */
  totalTime: number;
}

/**
 * Executes a function with retry logic and exponential backoff
 * 
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function execution
 * @throws The last error if all retries are exhausted
 * 
 * @example
 * // Basic usage with defaults (1 retry, exponential backoff)
 * const result = await withRetry(async () => {
 *   return await fetch('/api/data');
 * });
 * 
 * @example
 * // Custom retry configuration
 * const result = await withRetry(
 *   async () => await aiService.summarize(text),
 *   {
 *     maxRetries: 2,
 *     backoff: "exponential",
 *     initialDelay: 500,
 *     maxDelay: 5000,
 *     onRetry: (attempt, error, delay) => {
 *       console.log(`Retry attempt ${attempt} after ${delay}ms`);
 *     }
 *   }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 1,
    backoff = "exponential",
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry,
    shouldRetry: customShouldRetry,
  } = options;

  let lastError: any;
  const startTime = Date.now();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;

      // Check if we should retry this error
      const shouldRetryError = customShouldRetry
        ? customShouldRetry(error)
        : shouldRetryByDefault(error);

      if (!shouldRetryError) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay for next retry
      const delay = calculateDelay(attempt, backoff, initialDelay, maxDelay);

      // Invoke retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error, delay);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}

/**
 * Executes a function with retry logic and returns detailed result information
 * 
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns Detailed result including attempts and timing
 * @throws The last error if all retries are exhausted
 */
export async function withRetryDetailed<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const startTime = Date.now();
  let attempts = 0;

  const wrappedFn = async () => {
    attempts++;
    return await fn();
  };

  const value = await withRetry(wrappedFn, options);
  const totalTime = Date.now() - startTime;

  return {
    value,
    attempts,
    totalTime,
  };
}

/**
 * Default logic to determine if an error should be retried
 * 
 * @param error - The error to check
 * @returns true if the error should be retried
 */
function shouldRetryByDefault(error: any): boolean {
  // Don't retry APIErrors with non-retryable codes
  if (error instanceof APIError || error?.name === "APIError") {
    return !isNonRetryableError(error.code);
  }

  // Don't retry validation errors
  if (error?.name === "ValidationError" || error?.name === "ZodError") {
    return false;
  }

  // Retry network errors
  if (
    error?.code === "ECONNREFUSED" ||
    error?.code === "ENOTFOUND" ||
    error?.code === "ETIMEDOUT" ||
    error?.name === "TimeoutError"
  ) {
    return true;
  }

  // Retry 5xx errors (server errors)
  if (error?.response?.status >= 500 && error?.response?.status < 600) {
    return true;
  }

  // Retry 429 (rate limit) errors
  if (error?.response?.status === 429) {
    return true;
  }

  // Don't retry 4xx errors (client errors)
  if (error?.response?.status >= 400 && error?.response?.status < 500) {
    return false;
  }

  // Default: retry unknown errors
  return true;
}

/**
 * Calculates the delay before the next retry attempt
 * 
 * @param attempt - Current attempt number (0-indexed)
 * @param backoff - Backoff strategy
 * @param initialDelay - Initial delay in milliseconds
 * @param maxDelay - Maximum delay in milliseconds
 * @returns Delay in milliseconds
 */
function calculateDelay(
  attempt: number,
  backoff: "linear" | "exponential",
  initialDelay: number,
  maxDelay: number
): number {
  let delay: number;

  if (backoff === "exponential") {
    // Exponential backoff: initialDelay * 2^attempt
    delay = initialDelay * Math.pow(2, attempt);
  } else {
    // Linear backoff: initialDelay * (attempt + 1)
    delay = initialDelay * (attempt + 1);
  }

  // Add jitter (±10%) to prevent thundering herd
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  delay = delay + jitter;

  // Cap at maxDelay
  return Math.min(delay, maxDelay);
}

/**
 * Sleep for a specified duration
 * 
 * @param ms - Duration in milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wraps a fetch call with retry logic
 * 
 * @param url - The URL to fetch
 * @param init - Fetch options
 * @param retryOptions - Retry configuration
 * @returns The fetch response
 * 
 * @example
 * const response = await fetchWithRetry('/api/data', {
 *   method: 'POST',
 *   body: JSON.stringify(data)
 * }, {
 *   maxRetries: 2,
 *   initialDelay: 500
 * });
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, init);

    // Throw error for non-ok responses to trigger retry logic
    if (!response.ok) {
      const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.response = response;

      // Try to parse error body
      try {
        const body = await response.json();
        if (body.error) {
          throw new APIError(
            body.error.code || ErrorCodes.INTERNAL_ERROR,
            body.error.message || error.message,
            body.error.details
          );
        }
      } catch (parseError) {
        // If parsing fails, throw original error
      }

      throw error;
    }

    return response;
  }, retryOptions);
}

/**
 * Wraps a fetch call with retry logic and automatically parses JSON
 * 
 * @param url - The URL to fetch
 * @param init - Fetch options
 * @param retryOptions - Retry configuration
 * @returns The parsed JSON response
 * 
 * @example
 * const data = await fetchJSONWithRetry<{ result: string }>('/api/data', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ input: 'test' })
 * });
 */
export async function fetchJSONWithRetry<T = any>(
  url: string,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<T> {
  const response = await fetchWithRetry(url, init, retryOptions);
  return await response.json();
}

/**
 * Creates a retry wrapper for a function that can be reused
 * 
 * @param fn - The function to wrap
 * @param options - Retry configuration
 * @returns A wrapped function with retry logic
 * 
 * @example
 * const summarizeWithRetry = createRetryWrapper(
 *   (text: string) => aiService.summarize(text),
 *   { maxRetries: 2, initialDelay: 500 }
 * );
 * 
 * const result = await summarizeWithRetry("Some text");
 */
export function createRetryWrapper<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    return withRetry(() => fn(...args), options);
  };
}
