/**
 * Unit tests for AI Quiz Generation Endpoint
 * 
 * Tests request validation, AI service integration, token management,
 * and error handling for the /api/v1/ai/generate-quiz endpoint.
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

describe("POST /api/v1/ai/generate-quiz", () => {
  let mockGenerateQuiz: jest.Mock;
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
    mockGenerateQuiz = jest.fn();
    mockValidateRequest = jest.fn();
    mockTrackUsage = jest.fn();

    // Mock AIServiceAdapter
    (AIServiceAdapter as jest.Mock).mockImplementation(() => ({
      generateQuiz: mockGenerateQuiz,
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
    it("should reject text shorter than 100 characters", async () => {
      const request = new NextRequest("http://localhost:3000/api/v1/ai/generate-quiz", {
        method: "POST",
        body: JSON.stringify({ text: "Short text" }),
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
      const request = new NextRequest("http://localhost:3000/api/v1/ai/generate-quiz", {
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
      const validText = "a".repeat(150); // 150 characters

      mockGenerateQuiz.mockResolvedValue({
        questions: [
          {
            id: "q1",
            question: "What is the main topic?",
            options: ["A", "B", "C", "D"],
            correctAnswer: 0,
            explanation: "Explanation here",
          },
        ],
        metadata: {
          inputTokens: 100,
          outputTokens: 200,
          model: "gpt-4",
          cached: false,
          processingTime: 2000,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/v1/ai/generate-quiz", {
        method: "POST",
        body: JSON.stringify({ text: validText }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.questions).toHaveLength(1);
    });

    it("should validate questionCount range", async () => {
      const validText = "a".repeat(150);
      const request = new NextRequest("http://localhost:3000/api/v1/ai/generate-quiz", {
        method: "POST",
        body: JSON.stringify({
          text: validText,
          options: { questionCount: 10 },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INVALID_INPUT");
    });

    it("should validate difficulty enum", async () => {
      const validText = "a".repeat(150);
      const request = new NextRequest("http://localhost:3000/api/v1/ai/generate-quiz", {
        method: "POST",
        body: JSON.stringify({
          text: validText,
          options: { difficulty: "invalid" },
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe("INVALID_INPUT");
    });

    it("should validate temperature range", async () => {
      const validText = "a".repeat(150);
      const request = new NextRequest("http://localhost:3000/api/v1/ai/generate-quiz", {
        method: "POST",
        body: JSON.stringify({
          text: validText,
          options: { temperature: 2.0 },
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
      const validText = "a".repeat(150);

      mockGenerateQuiz.mockResolvedValue({
        questions: [
          {
            id: "q1",
            question: "Test question?",
            options: ["A", "B", "C", "D"],
            correctAnswer: 0,
            explanation: "Test explanation",
          },
        ],
        metadata: {
          inputTokens: 100,
          outputTokens: 200,
          model: "gpt-4",
          cached: false,
          processingTime: 2000,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/v1/ai/generate-quiz", {
        method: "POST",
        body: JSON.stringify({
          text: validText,
          options: { questionCount: 4, difficulty: "medium", temperature: 0.5 },
        }),
      });

      await POST(request);

      expect(mockGenerateQuiz).toHaveBeenCalledWith(
        validText,
        { questionCount: 4, difficulty: "medium", temperature: 0.5 }
      );
    });

    it("should return AI service response with metadata", async () => {
      const validText = "a".repeat(150);
      const mockResponse = {
        questions: [
          {
            id: "q1",
            question: "What is the capital of France?",
            options: ["Paris", "London", "Berlin", "Madrid"],
            correctAnswer: 0,
            explanation: "Paris is the capital and largest city of France.",
          },
          {
            id: "q2",
            question: "What is 2 + 2?",
            options: ["3", "4", "5", "6"],
            correctAnswer: 1,
            explanation: "2 + 2 equals 4.",
          },
        ],
        metadata: {
          inputTokens: 150,
          outputTokens: 300,
          model: "gpt-4",
          cached: false,
          processingTime: 2500,
        },
      };

      mockGenerateQuiz.mockResolvedValue(mockResponse);

      const request = new NextRequest("http://localhost:3000/api/v1/ai/generate-quiz", {
        method: "POST",
        body: JSON.stringify({ text: validText }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResponse);
      expect(data.data.questions).toHaveLength(2);
    });
  });

  describe("Token Management", () => {
    it("should validate token budget before processing", async () => {
      const validText = "a".repeat(150);

      mockGenerateQuiz.mockResolvedValue({
        questions: [
          {
            id: "q1",
            question: "Test?",
            options: ["A", "B", "C", "D"],
            correctAnswer: 0,
            explanation: "Test",
          },
        ],
        metadata: {
          inputTokens: 100,
          outputTokens: 200,
          model: "gpt-4",
          cached: false,
          processingTime: 2000,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/v1/ai/generate-quiz", {
        method: "POST",
        body: JSON.stringify({ text: validText }),
      });

      await POST(request);

      expect(mockValidateRequest).toHaveBeenCalledWith(validText, "quiz");
    });

    it("should track token usage after successful request", async () => {
      const validText = "a".repeat(150);

      mockGenerateQuiz.mockResolvedValue({
        questions: [
          {
            id: "q1",
            question: "Test?",
            options: ["A", "B", "C", "D"],
            correctAnswer: 0,
            explanation: "Test",
          },
        ],
        metadata: {
          inputTokens: 100,
          outputTokens: 200,
          model: "gpt-4",
          cached: false,
          processingTime: 2000,
        },
      });

      const request = new NextRequest("http://localhost:3000/api/v1/ai/generate-quiz", {
        method: "POST",
        body: JSON.stringify({ text: validText }),
      });

      await POST(request);

      expect(mockTrackUsage).toHaveBeenCalledWith(100, 200);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing environment variables", async () => {
      delete process.env.AI_PROVIDER;

      const validText = "a".repeat(150);
      const request = new NextRequest("http://localhost:3000/api/v1/ai/generate-quiz", {
        method: "POST",
        body: JSON.stringify({ text: validText }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
    });

    it("should handle AI service errors", async () => {
      const validText = "a".repeat(150);
      mockGenerateQuiz.mockRejectedValue(new Error("AI service unavailable"));

      const request = new NextRequest("http://localhost:3000/api/v1/ai/generate-quiz", {
        method: "POST",
        body: JSON.stringify({ text: validText }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBeGreaterThanOrEqual(500);
      expect(data.success).toBe(false);
    });

    it("should handle malformed JSON", async () => {
      const request = new NextRequest("http://localhost:3000/api/v1/ai/generate-quiz", {
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
