/**
 * Tests for timeout middleware
 * Validates: Requirements 1.7
 */

import { NextRequest, NextResponse } from "next/server";
import {
  withTimeout,
  TimeoutError,
  createTimeoutSignal,
  withPromiseTimeout,
} from "../timeout";
import { ErrorCodes } from "@/lib/errors";

describe("Timeout Middleware", () => {
  describe("withTimeout", () => {
    it("should return response if handler completes within timeout", async () => {
      const request = new NextRequest("http://localhost:3000/api/test");
      const handler = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return NextResponse.json({ data: "success" });
      });

      const result = await withTimeout(request, handler, { timeoutMs: 500 });

      expect(handler).toHaveBeenCalled();
      expect(result.status).toBe(200);
      const body = await result.json();
      expect(body.data).toBe("success");
    });

    it("should return timeout error if handler exceeds timeout", async () => {
      const request = new NextRequest("http://localhost:3000/api/test");
      const handler = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return NextResponse.json({ data: "success" });
      });

      const result = await withTimeout(request, handler, { timeoutMs: 100 });

      expect(result.status).toBe(504);
      const body = await result.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe(ErrorCodes.TIMEOUT);
      expect(body.error.message).toBe("Request timed out");
    });

    it("should call onTimeout callback when timeout occurs", async () => {
      const request = new NextRequest("http://localhost:3000/api/test");
      const onTimeout = jest.fn();
      const handler = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return NextResponse.json({ data: "success" });
      });

      await withTimeout(request, handler, {
        timeoutMs: 100,
        onTimeout,
      });

      expect(onTimeout).toHaveBeenCalledWith(request);
    });

    it("should use default timeout if not specified", async () => {
      const request = new NextRequest("http://localhost:3000/api/test");
      const handler = jest.fn(async () => {
        return NextResponse.json({ data: "success" });
      });

      const result = await withTimeout(request, handler);

      expect(result.status).toBe(200);
    });

    it("should propagate non-timeout errors", async () => {
      const request = new NextRequest("http://localhost:3000/api/test");
      const testError = new Error("Test error");
      const handler = jest.fn(async () => {
        throw testError;
      });

      await expect(withTimeout(request, handler, { timeoutMs: 500 })).rejects.toThrow(
        "Test error"
      );
    });
  });

  describe("TimeoutError", () => {
    it("should create timeout error with correct name", () => {
      const error = new TimeoutError("Timeout occurred");

      expect(error.name).toBe("TimeoutError");
      expect(error.message).toBe("Timeout occurred");
      expect(error instanceof Error).toBe(true);
    });
  });

  describe("createTimeoutSignal", () => {
    it("should create abort signal that aborts after timeout", async () => {
      const { signal, cleanup } = createTimeoutSignal(100);

      expect(signal.aborted).toBe(false);

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(signal.aborted).toBe(true);
      cleanup();
    });

    it("should allow cleanup to prevent abort", async () => {
      const { signal, cleanup } = createTimeoutSignal(100);

      cleanup();

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(signal.aborted).toBe(false);
    });
  });

  describe("withPromiseTimeout", () => {
    it("should resolve if promise completes within timeout", async () => {
      const promise = new Promise<string>((resolve) => {
        setTimeout(() => resolve("success"), 100);
      });

      const result = await withPromiseTimeout(promise, 500);

      expect(result).toBe("success");
    });

    it("should reject with TimeoutError if promise exceeds timeout", async () => {
      const promise = new Promise<string>((resolve) => {
        setTimeout(() => resolve("success"), 1000);
      });

      await expect(withPromiseTimeout(promise, 100)).rejects.toThrow(TimeoutError);
    });

    it("should use custom error message", async () => {
      const promise = new Promise<string>((resolve) => {
        setTimeout(() => resolve("success"), 1000);
      });

      await expect(
        withPromiseTimeout(promise, 100, "Custom timeout message")
      ).rejects.toThrow("Custom timeout message");
    });

    it("should propagate promise rejection", async () => {
      const promise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error("Promise error")), 100);
      });

      await expect(withPromiseTimeout(promise, 500)).rejects.toThrow("Promise error");
    });
  });
});
