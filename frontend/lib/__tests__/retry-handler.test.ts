/**
 * Unit tests for retry handler with exponential backoff
 * 
 * Tests cover:
 * - Basic retry functionality
 * - Exponential and linear backoff
 * - Retry limits
 * - Error categorization
 * - Custom retry logic
 * - Fetch wrappers
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  withRetry,
  withRetryDetailed,
  fetchWithRetry,
  fetchJSONWithRetry,
  createRetryWrapper,
  RetryOptions,
} from "../retry-handler";
import { APIError, ErrorCodes } from "../errors";

// Mock timers for testing delays
jest.useFakeTimers();

describe("withRetry", () => {
  beforeEach(() => {
    jest.clearAllTimers();
  });

  it("should return result on first success", async () => {
    const fn = jest.fn().mockResolvedValue("success");

    const promise = withRetry(fn);
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry once on failure then succeed", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("Temporary failure"))
      .mockResolvedValueOnce("success");

    const promise = withRetry(fn, { maxRetries: 1 });
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should throw error after max retries exhausted", async () => {
    const error = new Error("Persistent failure");
    const fn = jest.fn().mockRejectedValue(error);

    const promise = withRetry(fn, { maxRetries: 2 });
    await jest.runAllTimersAsync();

    await expect(promise).rejects.toThrow("Persistent failure");
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it("should not retry non-retryable APIErrors", async () => {
    const error = new APIError(ErrorCodes.INVALID_INPUT, "Invalid input");
    const fn = jest.fn().mockRejectedValue(error);

    const promise = withRetry(fn, { maxRetries: 2 });
    await jest.runAllTimersAsync();

    await expect(promise).rejects.toThrow(error);
    expect(fn).toHaveBeenCalledTimes(1); // No retries
  });

  it("should retry retryable APIErrors", async () => {
    const error = new APIError(ErrorCodes.AI_TIMEOUT, "Timeout");
    const fn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce("success");

    const promise = withRetry(fn, { maxRetries: 1 });
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should use exponential backoff by default", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("Fail 1"))
      .mockRejectedValueOnce(new Error("Fail 2"))
      .mockResolvedValueOnce("success");

    const promise = withRetry(fn, {
      maxRetries: 2,
      initialDelay: 1000,
    });

    // First call fails
    await jest.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);

    // Wait for first retry (1000ms with jitter)
    await jest.advanceTimersByTimeAsync(1100);
    expect(fn).toHaveBeenCalledTimes(2);

    // Wait for second retry (2000ms with jitter)
    await jest.advanceTimersByTimeAsync(2200);
    expect(fn).toHaveBeenCalledTimes(3);

    const result = await promise;
    expect(result).toBe("success");
  });

  it("should use linear backoff when specified", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("Fail 1"))
      .mockRejectedValueOnce(new Error("Fail 2"))
      .mockResolvedValueOnce("success");

    const promise = withRetry(fn, {
      maxRetries: 2,
      backoff: "linear",
      initialDelay: 1000,
    });

    await jest.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);

    // Linear: 1000ms
    await jest.advanceTimersByTimeAsync(1100);
    expect(fn).toHaveBeenCalledTimes(2);

    // Linear: 2000ms
    await jest.advanceTimersByTimeAsync(2200);
    expect(fn).toHaveBeenCalledTimes(3);

    const result = await promise;
    expect(result).toBe("success");
  });

  it("should respect maxDelay cap", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("Fail"))
      .mockResolvedValueOnce("success");

    const promise = withRetry(fn, {
      maxRetries: 1,
      initialDelay: 10000,
      maxDelay: 2000,
    });

    await jest.advanceTimersByTimeAsync(0);
    expect(fn).toHaveBeenCalledTimes(1);

    // Should cap at maxDelay (2000ms)
    await jest.advanceTimersByTimeAsync(2200);
    expect(fn).toHaveBeenCalledTimes(2);

    const result = await promise;
    expect(result).toBe("success");
  });

  it("should call onRetry callback", async () => {
    const onRetry = jest.fn();
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("Fail"))
      .mockResolvedValueOnce("success");

    const promise = withRetry(fn, {
      maxRetries: 1,
      onRetry,
    });

    await jest.runAllTimersAsync();
    await promise;

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(
      1,
      expect.any(Error),
      expect.any(Number)
    );
  });

  it("should use custom shouldRetry function", async () => {
    const shouldRetry = jest.fn().mockReturnValue(false);
    const fn = jest.fn().mockRejectedValue(new Error("Fail"));

    const promise = withRetry(fn, {
      maxRetries: 2,
      shouldRetry,
    });

    await jest.runAllTimersAsync();

    await expect(promise).rejects.toThrow("Fail");
    expect(fn).toHaveBeenCalledTimes(1); // No retries
    expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error));
  });

  it("should not retry validation errors", async () => {
    const error = { name: "ValidationError", message: "Invalid" };
    const fn = jest.fn().mockRejectedValue(error);

    const promise = withRetry(fn, { maxRetries: 2 });
    await jest.runAllTimersAsync();

    await expect(promise).rejects.toEqual(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry network errors", async () => {
    const error = { code: "ECONNREFUSED", message: "Connection refused" };
    const fn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce("success");

    const promise = withRetry(fn, { maxRetries: 1 });
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should retry 5xx errors", async () => {
    const error = { response: { status: 503 } };
    const fn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce("success");

    const promise = withRetry(fn, { maxRetries: 1 });
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should not retry 4xx errors (except 429)", async () => {
    const error = { response: { status: 400 } };
    const fn = jest.fn().mockRejectedValue(error);

    const promise = withRetry(fn, { maxRetries: 2 });
    await jest.runAllTimersAsync();

    await expect(promise).rejects.toEqual(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry 429 errors", async () => {
    const error = { response: { status: 429 } };
    const fn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce("success");

    const promise = withRetry(fn, { maxRetries: 1 });
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe("withRetryDetailed", () => {
  it("should return detailed result on success", async () => {
    const fn = jest.fn().mockResolvedValue("success");

    const promise = withRetryDetailed(fn);
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result.value).toBe("success");
    expect(result.attempts).toBe(1);
    expect(result.totalTime).toBeGreaterThanOrEqual(0);
  });

  it("should track multiple attempts", async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error("Fail"))
      .mockResolvedValueOnce("success");

    const promise = withRetryDetailed(fn, { maxRetries: 1 });
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result.value).toBe("success");
    expect(result.attempts).toBe(2);
  });
});

describe("fetchWithRetry", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("should return response on success", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ data: "test" }),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const promise = fetchWithRetry("/api/test");
    await jest.runAllTimersAsync();
    const response = await promise;

    expect(response).toBe(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith("/api/test", undefined);
  });

  it("should throw APIError on error response with error body", async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: jest.fn().mockResolvedValue({
        error: {
          code: "INVALID_INPUT",
          message: "Invalid data",
        },
      }),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const promise = fetchWithRetry("/api/test", undefined, { maxRetries: 0 });
    await jest.runAllTimersAsync();

    await expect(promise).rejects.toThrow(APIError);
    await expect(promise).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: "Invalid data",
    });
  });

  it("should retry on 5xx errors", async () => {
    const errorResponse = {
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: jest.fn().mockResolvedValue({}),
    };
    const successResponse = {
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ data: "test" }),
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(errorResponse)
      .mockResolvedValueOnce(successResponse);

    const promise = fetchWithRetry("/api/test", undefined, { maxRetries: 1 });
    await jest.runAllTimersAsync();
    const response = await promise;

    expect(response).toBe(successResponse);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe("fetchJSONWithRetry", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("should return parsed JSON on success", async () => {
    const mockData = { result: "test data" };
    const mockResponse = {
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue(mockData),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const promise = fetchJSONWithRetry("/api/test");
    await jest.runAllTimersAsync();
    const data = await promise;

    expect(data).toEqual(mockData);
  });

  it("should pass fetch options correctly", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({}),
    };
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const options = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ test: "data" }),
    };

    const promise = fetchJSONWithRetry("/api/test", options);
    await jest.runAllTimersAsync();
    await promise;

    expect(global.fetch).toHaveBeenCalledWith("/api/test", options);
  });
});

describe("createRetryWrapper", () => {
  it("should create a reusable retry wrapper", async () => {
    const originalFn = jest.fn().mockResolvedValue("success");
    const wrappedFn = createRetryWrapper(originalFn, { maxRetries: 2 });

    const promise = wrappedFn();
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("success");
    expect(originalFn).toHaveBeenCalledTimes(1);
  });

  it("should pass arguments correctly", async () => {
    const originalFn = jest
      .fn()
      .mockImplementation((a: number, b: string) => Promise.resolve(`${a}-${b}`));
    const wrappedFn = createRetryWrapper(originalFn);

    const promise = wrappedFn(42, "test");
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("42-test");
    expect(originalFn).toHaveBeenCalledWith(42, "test");
  });

  it("should retry on failures", async () => {
    const originalFn = jest
      .fn()
      .mockRejectedValueOnce(new Error("Fail"))
      .mockResolvedValueOnce("success");
    const wrappedFn = createRetryWrapper(originalFn, { maxRetries: 1 });

    const promise = wrappedFn();
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toBe("success");
    expect(originalFn).toHaveBeenCalledTimes(2);
  });
});
