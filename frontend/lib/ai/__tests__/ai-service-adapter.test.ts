/**
 * Unit tests for AI Service Adapter
 * 
 * Tests the core functionality of the AI service adapter including:
 * - Input validation
 * - Token counting
 * - Cache integration
 * - Error handling
 * - Response validation
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { AIServiceAdapter } from "../ai-service-adapter";
import { APIError } from "../../errors";
import type {
  AIProvider,
  AIConfig,
  SummaryResult,
  QuizResult,
} from "../types";

// Mock AI Provider
class MockAIProvider implements AIProvider {
  name = "openai" as const;

  async summarize(text: string): Promise<SummaryResult> {
    return {
      summary: "This is a test summary",
      keyPoints: ["Point 1", "Point 2", "Point 3"],
      metadata: {
        inputTokens: 100,
        outputTokens: 50,
        model: "gpt-4",
        cached: false,
        processingTime: 0,
      },
    };
  }

  async generateQuiz(text: string): Promise<QuizResult> {
    return {
      questions: [
        {
          id: "1",
          question: "Test question?",
          options: ["A", "B", "C", "D"],
          correctAnswer: 0,
          explanation: "Test explanation",
        },
        {
          id: "2",
          question: "Test question 2?",
          options: ["A", "B", "C", "D"],
          correctAnswer: 1,
          explanation: "Test explanation 2",
        },
        {
          id: "3",
          question: "Test question 3?",
          options: ["A", "B", "C", "D"],
          correctAnswer: 2,
          explanation: "Test explanation 3",
        },
      ],
      metadata: {
        inputTokens: 200,
        outputTokens: 150,
        model: "gpt-4",
        cached: false,
        processingTime: 0,
      },
    };
  }

  countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

// Test configuration
const testConfig: AIConfig = {
  provider: "openai",
  apiKey: "test-key",
  model: "gpt-4",
  maxInputTokens: 4000,
  maxOutputTokens: {
    summary: 500,
    quiz: 1000,
  },
  timeout: 15000,
  cacheEnabled: true,
};

describe("AIServiceAdapter", () => {
  let adapter: AIServiceAdapter;
  let mockProvider: MockAIProvider;

  beforeEach(() => {
    mockProvider = new MockAIProvider();
    adapter = new AIServiceAdapter(mockProvider, testConfig);
  });

  describe("Constructor and Configuration", () => {
    it("should initialize with provider and config", () => {
      expect(adapter.getProviderName()).toBe("openai");
      expect(adapter.getModelName()).toBe("gpt-4");
    });

    it("should allow setting cache integration functions", () => {
      const checkFn = jest.fn();
      const storeFn = jest.fn();
      
      adapter.setCacheIntegration(checkFn, storeFn);
      
      // No error should be thrown
      expect(true).toBe(true);
    });
  });

  describe("Token Counting", () => {
    it("should count tokens correctly", () => {
      const text = "This is a test text with some words";
      const tokenCount = adapter.countTokens(text);
      
      expect(tokenCount).toBeGreaterThan(0);
      expect(tokenCount).toBe(Math.ceil(text.length / 4));
    });
  });

  describe("Summarize - Input Validation", () => {
    it("should reject empty text", async () => {
      await expect(adapter.summarize("")).rejects.toThrow(APIError);
      await expect(adapter.summarize("")).rejects.toThrow("Text cannot be empty");
    });

    it("should reject whitespace-only text", async () => {
      await expect(adapter.summarize("   ")).rejects.toThrow(APIError);
      await expect(adapter.summarize("   ")).rejects.toThrow("Text cannot be empty");
    });

    it("should reject text exceeding token limit", async () => {
      const longText = "a".repeat(20000); // ~5000 tokens
      
      await expect(adapter.summarize(longText)).rejects.toThrow(APIError);
      await expect(adapter.summarize(longText)).rejects.toThrow("exceeds maximum token limit");
    });

    it("should return original text for short inputs (< 50 chars)", async () => {
      const shortText = "Short text";
      const result = await adapter.summarize(shortText);
      
      expect(result.summary).toBe(shortText);
      expect(result.keyPoints).toEqual([]);
      expect(result.metadata.cached).toBe(false);
    });
  });

  describe("Summarize - Success Cases", () => {
    it("should successfully summarize valid text", async () => {
      const text = "This is a longer text that should be summarized properly with enough content to pass validation.";
      const result = await adapter.summarize(text);
      
      expect(result.summary).toBe("This is a test summary");
      expect(result.keyPoints).toHaveLength(3);
      expect(result.metadata.cached).toBe(false);
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
    });

    it("should include processing time in metadata", async () => {
      const text = "This is a longer text that should be summarized properly with enough content to pass validation.";
      const result = await adapter.summarize(text);
      
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
    });

    it("should pass options to provider", async () => {
      const text = "This is a longer text that should be summarized properly with enough content to pass validation.";
      const options = { maxKeyPoints: 5, temperature: 0.3 };
      
      const summarizeSpy = jest.spyOn(mockProvider, "summarize");
      await adapter.summarize(text, options);
      
      expect(summarizeSpy).toHaveBeenCalledWith(text, options);
    });
  });

  describe("Summarize - Cache Integration", () => {
    it("should check cache before calling provider", async () => {
      const cachedResult: SummaryResult = {
        summary: "Cached summary",
        keyPoints: ["Cached 1", "Cached 2", "Cached 3"],
        metadata: {
          inputTokens: 100,
          outputTokens: 50,
          model: "gpt-4",
          cached: false,
          processingTime: 100,
        },
      };

      const checkFn = jest.fn().mockResolvedValue(cachedResult);
      const storeFn = jest.fn();
      adapter.setCacheIntegration(checkFn, storeFn);

      const text = "This is a longer text that should be summarized properly with enough content to pass validation.";
      const result = await adapter.summarize(text);

      expect(checkFn).toHaveBeenCalled();
      expect(result.summary).toBe("Cached summary");
      expect(result.metadata.cached).toBe(true);
    });

    it("should store result in cache after successful call", async () => {
      const checkFn = jest.fn().mockResolvedValue(null);
      const storeFn = jest.fn();
      adapter.setCacheIntegration(checkFn, storeFn);

      const text = "This is a longer text that should be summarized properly with enough content to pass validation.";
      await adapter.summarize(text);

      expect(storeFn).toHaveBeenCalled();
    });

    it("should not use cache when disabled", async () => {
      const noCacheAdapter = new AIServiceAdapter(mockProvider, {
        ...testConfig,
        cacheEnabled: false,
      });

      const checkFn = jest.fn();
      const storeFn = jest.fn();
      noCacheAdapter.setCacheIntegration(checkFn, storeFn);

      const text = "This is a longer text that should be summarized properly with enough content to pass validation.";
      await noCacheAdapter.summarize(text);

      expect(checkFn).not.toHaveBeenCalled();
      expect(storeFn).not.toHaveBeenCalled();
    });
  });

  describe("Summarize - Response Validation", () => {
    it("should reject response without summary field", async () => {
      const invalidProvider = new MockAIProvider();
      invalidProvider.summarize = jest.fn().mockResolvedValue({
        keyPoints: ["Point 1", "Point 2", "Point 3"],
        metadata: {},
      });

      const invalidAdapter = new AIServiceAdapter(invalidProvider, testConfig);
      const text = "This is a longer text that should be summarized properly with enough content to pass validation.";

      await expect(invalidAdapter.summarize(text)).rejects.toThrow(APIError);
      await expect(invalidAdapter.summarize(text)).rejects.toThrow("missing or invalid summary");
    });

    it("should reject response without keyPoints field", async () => {
      const invalidProvider = new MockAIProvider();
      invalidProvider.summarize = jest.fn().mockResolvedValue({
        summary: "Test summary",
        metadata: {},
      });

      const invalidAdapter = new AIServiceAdapter(invalidProvider, testConfig);
      const text = "This is a longer text that should be summarized properly with enough content to pass validation.";

      await expect(invalidAdapter.summarize(text)).rejects.toThrow(APIError);
      await expect(invalidAdapter.summarize(text)).rejects.toThrow("missing or invalid keyPoints");
    });

    it("should reject response with too few key points", async () => {
      const invalidProvider = new MockAIProvider();
      invalidProvider.summarize = jest.fn().mockResolvedValue({
        summary: "Test summary",
        keyPoints: ["Point 1", "Point 2"],
        metadata: {},
      });

      const invalidAdapter = new AIServiceAdapter(invalidProvider, testConfig);
      const text = "This is a longer text that should be summarized properly with enough content to pass validation.";

      await expect(invalidAdapter.summarize(text)).rejects.toThrow(APIError);
      await expect(invalidAdapter.summarize(text)).rejects.toThrow("3-7 key points");
    });

    it("should reject response with too many key points", async () => {
      const invalidProvider = new MockAIProvider();
      invalidProvider.summarize = jest.fn().mockResolvedValue({
        summary: "Test summary",
        keyPoints: ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8"],
        metadata: {},
      });

      const invalidAdapter = new AIServiceAdapter(invalidProvider, testConfig);
      const text = "This is a longer text that should be summarized properly with enough content to pass validation.";

      await expect(invalidAdapter.summarize(text)).rejects.toThrow(APIError);
      await expect(invalidAdapter.summarize(text)).rejects.toThrow("3-7 key points");
    });
  });

  describe("GenerateQuiz - Input Validation", () => {
    it("should reject empty text", async () => {
      await expect(adapter.generateQuiz("")).rejects.toThrow(APIError);
      await expect(adapter.generateQuiz("")).rejects.toThrow("Text cannot be empty");
    });

    it("should reject text shorter than 100 characters", async () => {
      const shortText = "Short text";
      
      await expect(adapter.generateQuiz(shortText)).rejects.toThrow(APIError);
      await expect(adapter.generateQuiz(shortText)).rejects.toThrow("at least 100 characters");
    });

    it("should reject text exceeding token limit", async () => {
      const longText = "a".repeat(20000); // ~5000 tokens
      
      await expect(adapter.generateQuiz(longText)).rejects.toThrow(APIError);
      await expect(adapter.generateQuiz(longText)).rejects.toThrow("exceeds maximum token limit");
    });
  });

  describe("GenerateQuiz - Success Cases", () => {
    it("should successfully generate quiz for valid text", async () => {
      const text = "This is a longer text with enough content to generate quiz questions. It has multiple sentences and concepts that can be tested.";
      const result = await adapter.generateQuiz(text);
      
      expect(result.questions).toHaveLength(3);
      expect(result.metadata.cached).toBe(false);
      expect(result.metadata.processingTime).toBeGreaterThanOrEqual(0);
    });

    it("should pass options to provider", async () => {
      const text = "This is a longer text with enough content to generate quiz questions. It has multiple sentences and concepts that can be tested.";
      const options = { questionCount: 4, difficulty: "medium" as const, temperature: 0.5 };
      
      const generateQuizSpy = jest.spyOn(mockProvider, "generateQuiz");
      await adapter.generateQuiz(text, options);
      
      expect(generateQuizSpy).toHaveBeenCalledWith(text, options);
    });
  });

  describe("GenerateQuiz - Response Validation", () => {
    it("should reject response without questions field", async () => {
      const invalidProvider = new MockAIProvider();
      invalidProvider.generateQuiz = jest.fn().mockResolvedValue({
        metadata: {},
      });

      const invalidAdapter = new AIServiceAdapter(invalidProvider, testConfig);
      const text = "This is a longer text with enough content to generate quiz questions. It has multiple sentences and concepts that can be tested.";

      await expect(invalidAdapter.generateQuiz(text)).rejects.toThrow(APIError);
      await expect(invalidAdapter.generateQuiz(text)).rejects.toThrow("missing or invalid questions");
    });

    it("should reject response with empty questions array", async () => {
      const invalidProvider = new MockAIProvider();
      invalidProvider.generateQuiz = jest.fn().mockResolvedValue({
        questions: [],
        metadata: {},
      });

      const invalidAdapter = new AIServiceAdapter(invalidProvider, testConfig);
      const text = "This is a longer text with enough content to generate quiz questions. It has multiple sentences and concepts that can be tested.";

      await expect(invalidAdapter.generateQuiz(text)).rejects.toThrow(APIError);
      await expect(invalidAdapter.generateQuiz(text)).rejects.toThrow("No questions generated");
    });

    it("should reject response with too few questions", async () => {
      const invalidProvider = new MockAIProvider();
      invalidProvider.generateQuiz = jest.fn().mockResolvedValue({
        questions: [
          {
            id: "1",
            question: "Test?",
            options: ["A", "B", "C", "D"],
            correctAnswer: 0,
            explanation: "Test",
          },
        ],
        metadata: {},
      });

      const invalidAdapter = new AIServiceAdapter(invalidProvider, testConfig);
      const text = "This is a longer text with enough content to generate quiz questions. It has multiple sentences and concepts that can be tested.";

      await expect(invalidAdapter.generateQuiz(text)).rejects.toThrow(APIError);
      await expect(invalidAdapter.generateQuiz(text)).rejects.toThrow("3-5 questions");
    });

    it("should reject question without id", async () => {
      const invalidProvider = new MockAIProvider();
      invalidProvider.generateQuiz = jest.fn().mockResolvedValue({
        questions: [
          {
            question: "Test?",
            options: ["A", "B", "C", "D"],
            correctAnswer: 0,
            explanation: "Test",
          },
          {
            id: "2",
            question: "Test 2?",
            options: ["A", "B", "C", "D"],
            correctAnswer: 0,
            explanation: "Test",
          },
          {
            id: "3",
            question: "Test 3?",
            options: ["A", "B", "C", "D"],
            correctAnswer: 0,
            explanation: "Test",
          },
        ],
        metadata: {},
      });

      const invalidAdapter = new AIServiceAdapter(invalidProvider, testConfig);
      const text = "This is a longer text with enough content to generate quiz questions. It has multiple sentences and concepts that can be tested.";

      await expect(invalidAdapter.generateQuiz(text)).rejects.toThrow(APIError);
      await expect(invalidAdapter.generateQuiz(text)).rejects.toThrow("missing or invalid id");
    });

    it("should reject question with wrong number of options", async () => {
      const invalidProvider = new MockAIProvider();
      invalidProvider.generateQuiz = jest.fn().mockResolvedValue({
        questions: [
          {
            id: "1",
            question: "Test?",
            options: ["A", "B", "C"],
            correctAnswer: 0,
            explanation: "Test",
          },
          {
            id: "2",
            question: "Test 2?",
            options: ["A", "B", "C", "D"],
            correctAnswer: 0,
            explanation: "Test",
          },
          {
            id: "3",
            question: "Test 3?",
            options: ["A", "B", "C", "D"],
            correctAnswer: 0,
            explanation: "Test",
          },
        ],
        metadata: {},
      });

      const invalidAdapter = new AIServiceAdapter(invalidProvider, testConfig);
      const text = "This is a longer text with enough content to generate quiz questions. It has multiple sentences and concepts that can be tested.";

      await expect(invalidAdapter.generateQuiz(text)).rejects.toThrow(APIError);
      await expect(invalidAdapter.generateQuiz(text)).rejects.toThrow("exactly 4 options");
    });

    it("should reject question with invalid correctAnswer", async () => {
      const invalidProvider = new MockAIProvider();
      invalidProvider.generateQuiz = jest.fn().mockResolvedValue({
        questions: [
          {
            id: "1",
            question: "Test?",
            options: ["A", "B", "C", "D"],
            correctAnswer: 5,
            explanation: "Test",
          },
          {
            id: "2",
            question: "Test 2?",
            options: ["A", "B", "C", "D"],
            correctAnswer: 0,
            explanation: "Test",
          },
          {
            id: "3",
            question: "Test 3?",
            options: ["A", "B", "C", "D"],
            correctAnswer: 0,
            explanation: "Test",
          },
        ],
        metadata: {},
      });

      const invalidAdapter = new AIServiceAdapter(invalidProvider, testConfig);
      const text = "This is a longer text with enough content to generate quiz questions. It has multiple sentences and concepts that can be tested.";

      await expect(invalidAdapter.generateQuiz(text)).rejects.toThrow(APIError);
      await expect(invalidAdapter.generateQuiz(text)).rejects.toThrow("between 0 and 3");
    });
  });

  describe("Error Handling", () => {
    it("should handle rate limit errors", async () => {
      const errorProvider = new MockAIProvider();
      errorProvider.summarize = jest.fn().mockRejectedValue({
        code: "rate_limit_exceeded",
        message: "Rate limit exceeded",
      });

      const errorAdapter = new AIServiceAdapter(errorProvider, testConfig);
      const text = "This is a longer text that should be summarized properly with enough content to pass validation.";

      await expect(errorAdapter.summarize(text)).rejects.toThrow(APIError);
      await expect(errorAdapter.summarize(text)).rejects.toThrow("rate limit exceeded");
    });

    it("should handle timeout errors", async () => {
      const errorProvider = new MockAIProvider();
      errorProvider.summarize = jest.fn().mockRejectedValue({
        code: "timeout",
        message: "Request timed out",
      });

      const errorAdapter = new AIServiceAdapter(errorProvider, testConfig);
      const text = "This is a longer text that should be summarized properly with enough content to pass validation.";

      await expect(errorAdapter.summarize(text)).rejects.toThrow(APIError);
      await expect(errorAdapter.summarize(text)).rejects.toThrow("timed out");
    });

    it("should handle generic AI service errors", async () => {
      const errorProvider = new MockAIProvider();
      errorProvider.summarize = jest.fn().mockRejectedValue({
        message: "Unknown error",
      });

      const errorAdapter = new AIServiceAdapter(errorProvider, testConfig);
      const text = "This is a longer text that should be summarized properly with enough content to pass validation.";

      await expect(errorAdapter.summarize(text)).rejects.toThrow(APIError);
      await expect(errorAdapter.summarize(text)).rejects.toThrow("AI service encountered an error");
    });
  });
});

