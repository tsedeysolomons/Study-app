/**
 * Unit tests for AI Summarization Endpoint
 * 
 * Tests request validation, AI service integration, token management,
 * and error handling for the /api/v1/ai/summarize endpoint.
 */

import { POST } from "../route";
import { NextRequest } from "next/server";
import { AIServiceAdapter } from "@/lib/ai";
import { TokenManager } from "@/lib/ai/token-manager";

// Mock environment variables
const mockEnv = {
  AI_PROVIDER: "openai",
  AI_API_KEY: "test-api-key-1234567890",
  AI_MODEL: "gpt-4",
  AI_MAX_INPUT_TOKENS: "4000",
  AI_MAX_OUTPUT_TOKENS_SUMMARY: "500",
  AI_MAX_OUTPUT_TOKENS_QUIZ: "1000",
  AI_REQUEST_TIMEOUT: "15000",
  CACHE_ENABLED: "true",
};

// Mock AI service adapter
jest.mock("@/lib/ai", () => ({
  AIServiceAdapter: jest.fn(),
  OpenAIProvider: jest.fn(),
  AnthropicProvider: jest.fn(),
}));

// Mock token manager
jest.mock("@/lib/ai/token-manager", () => ({
  TokenManager: jest.fn(),
}));

describe("POST /api/v1/ai/summarize", () => {
  let mockSummarize: jest.Mock;
  let mockValidateRequest: jest.Mock;
  let mockTrackUsage: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Set environment variables
    Object.entries(mockEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });

    // Setup mock functions
    mockSummarize = jest.fn();
    mockValidateRequest = jest.fn();
    mockTrackUsage = jest.fn();

    // Mock AIServiceAdapter
    (AIServiceAdapter as jest.Mock).mockImplementation(() => ({
      summarize: mockSummarize,
    }));

    // Mock TokenManager
    (TokenManager as jest.Mock).mockImplementation(() => ({
      validateRequest: mockValidateRequest,
      trackUsage: mockTrackUsage,
    }));
  });

  afterEach(() => {
    // Clean up environment variables
    Object.keys(mockEnv).forEach((key) => {
      delete process.env[key];
    });
  });

  describe("Request Validation", () => {
    it("should reject empty text", async () => {
      const request = new NextRequest("http://localhost:3000/api/v1/ai/summarize", {
        method: "POST",
        body: JSON.stringify({ text: "" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INVALID_INPUT");
      expect(data.error.message).toBe("Request validation failed");
    });

    it("should reject text that is too long", async () => {
      const longText = "a".repeat(50001);
      const request = new NextRequest("http://localhost:3000/api/v1/ai/summarize", {
        method: "POST",
        body: JSON.stringify({ text: longText }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INVALID_INPUT");
    });

    it("should accept valid text without options", async () => {
      mockSummarize.mockResolvedValue({
        summary: "Test summary",
        keyPoints: ["Point 1", "Point 2", "Point 3"],
        metadata: {
          inputTokens: 100,
          outputTokens: 50,
          model: "gpt-4",
          cached: false,
          processingTime: 1000,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/v1/ai/summarize", {
        method: "POST",
        body: JSON.stringify({ text: "This is a test text for summarization." }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.summary).toBe("Test summary");
    });

    it("should validate maxKeyPoints range", async () => {
      const request = new NextRequest("http://localhost:3000/api/v1/ai/summarize", {
        method: "POST",
        body: JSON.stringify({
          text: "Test text",
          options: { maxKeyPoints: 10 },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INVALID_INPUT");
    });

    it("should validate temperature range", async () => {
      const request = new NextRequest("http://localhost:3000/api/v1/ai/summarize", {
        method: "POST",
        body: JSON.stringify({
          text: "Test text",
          options: { temperature: 1.5 },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INVALID_INPUT");
    });
  });

  describe("AI Service Integration", () => {
    it("should call AI service with correct parameters", async () => {
      mockSummarize.mockResolvedValue({
        summary: "Test summary",
        keyPoints: ["Point 1", "Point 2", "Point 3"],
        metadata: {
          inputTokens: 100,
          outputTokens: 50,
          model: "gpt-4",
          cached: false,
          processingTime: 1000,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/v1/ai/summarize", {
        method: "POST",
        body: JSON.stringify({
          text: "Test text for summarization",
          options: { maxKeyPoints: 5, temperature: 0.3 },
        }),
      });

      await POST(request);

      expect(mockSummarize).toHaveBeenCalledWith(
        "Test text for summarization",
        { maxKeyPoints: 5, temperature: 0.3 }
      );
    });

    it("should return AI service response with metadata", async () => {
      const mockResponse = {
        summary: "This is a comprehensive summary of the input text.",
        keyPoints: [
          "Key point 1",
          "Key point 2",
          "Key point 3",
          "Key point 4",
          "Key point 5",
        ],
        metadata: {
          inputTokens: 150,
          outputTokens: 75,
          model: "gpt-4",
          cached: false,
          processingTime: 1500,
        },
      };

      mockSummarize.mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost:3000/api/v1/ai/summarize", {
        method: "POST",
        body: JSON.stringify({ text: "Test text" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResponse);
    });
  });

  describe("Token Management", () => {
    it("should validate token budget before processing", async () => {
      mockSummarize.mockResolvedValue({
        summary: "Test summary",
        keyPoints: ["Point 1", "Point 2", "Point 3"],
        metadata: {
          inputTokens: 100,
          outputTokens: 50,
          model: "gpt-4",
          cached: false,
          processingTime: 1000,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/v1/ai/summarize", {
        method: "POST",
        body: JSON.stringify({ text: "Test text" }),
      });

      await POST(request);

      expect(mockValidateRequest).toHaveBeenCalledWith("Test text", "summary");
    });

    it("should track token usage after successful request", async () => {
      mockSummarize.mockResolvedValue({
        summary: "Test summary",
        keyPoints: ["Point 1", "Point 2", "Point 3"],
        metadata: {
          inputTokens: 100,
          outputTokens: 50,
          model: "gpt-4",
          cached: false,
          processingTime: 1000,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/v1/ai/summarize", {
        method: "POST",
        body: JSON.stringify({ text: "Test text" }),
      });

      await POST(request);

      expect(mockTrackUsage).toHaveBeenCalledWith(100, 50);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing environment variables", async () => {
      delete process.env.AI_PROVIDER;

      const request = new NextRequest("http://localhost:3000/api/v1/ai/summarize", {
        method: "POST",
        body: JSON.stringify({ text: "Test text" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it("should handle AI service errors", async () => {
      mockSummarize.mockRejectedValue(new Error("AI service unavailable"));

      const request = new NextRequest("http://localhost:3000/api/v1/ai/summarize", {
        method: "POST",
        body: JSON.stringify({ text: "Test text" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(500);
      expect(data.success).toBe(false);
    });

    it("should handle malformed JSON", async () => {
      const request = new NextRequest("http://localhost:3000/api/v1/ai/summarize", {
        method: "POST",
        body: "invalid json",
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(data.success).toBe(false);
    });
  });
});
