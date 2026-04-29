/**
 * Unit tests for Anthropic Provider
 * 
 * Tests the Anthropic provider implementation including:
 * - Summarization with JSON response format
 * - Quiz generation with question validation
 * - Token counting approximation
 * - Error handling
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { AnthropicProvider } from "../anthropic-provider";
import type { AIConfig } from "../types";
import Anthropic from "@anthropic-ai/sdk";

// Mock the Anthropic SDK
jest.mock("@anthropic-ai/sdk");

// Test configuration
const testConfig: AIConfig = {
  provider: "anthropic",
  apiKey: "test-api-key",
  model: "claude-3-sonnet-20240229",
  maxInputTokens: 4000,
  maxOutputTokens: {
    summary: 500,
    quiz: 1000,
  },
  timeout: 15000,
  cacheEnabled: true,
};

describe("AnthropicProvider", () => {
  let provider: AnthropicProvider;
  let mockClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock Anthropic client
    mockClient = {
      messages: {
        create: jest.fn(),
      },
    };

    // Mock Anthropic constructor
    (Anthropic as any).mockImplementation(() => mockClient);

    // Create provider instance
    provider = new AnthropicProvider(testConfig);
  });

  describe("Constructor", () => {
    it("should initialize with correct configuration", () => {
      expect(provider.name).toBe("anthropic");
      expect(Anthropic).toHaveBeenCalledWith({
        apiKey: "test-api-key",
        timeout: 15000,
        maxRetries: 1,
      });
    });

    it("should use default model if not specified", () => {
      const configWithoutModel = { ...testConfig };
      delete (configWithoutModel as any).model;
      
      const providerWithoutModel = new AnthropicProvider(configWithoutModel);
      expect(providerWithoutModel).toBeDefined();
    });

    it("should use default timeout if not specified", () => {
      const configWithoutTimeout = { ...testConfig };
      delete (configWithoutTimeout as any).timeout;
      
      new AnthropicProvider(configWithoutTimeout);
      
      expect(Anthropic).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 15000,
        })
      );
    });
  });

  describe("Token Counting", () => {
    it("should count tokens using 4 chars per token approximation", () => {
      const text = "This is a test text with some words";
      const expectedTokens = Math.ceil(text.length / 4);
      
      expect(provider.countTokens(text)).toBe(expectedTokens);
    });

    it("should handle empty text", () => {
      expect(provider.countTokens("")).toBe(0);
    });

    it("should handle long text", () => {
      const longText = "a".repeat(4000);
      const expectedTokens = Math.ceil(4000 / 4);
      
      expect(provider.countTokens(longText)).toBe(expectedTokens);
    });

    it("should round up fractional tokens", () => {
      const text = "abc"; // 3 chars = 0.75 tokens, should round to 1
      expect(provider.countTokens(text)).toBe(1);
    });
  });

  describe("Summarize", () => {
    const mockSummaryResponse = {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            summary: "This is a test summary of the input text.",
            keyPoints: [
              "Key point 1",
              "Key point 2",
              "Key point 3",
              "Key point 4",
              "Key point 5",
            ],
          }),
        },
      ],
      usage: {
        input_tokens: 100,
        output_tokens: 50,
      },
    };

    it("should successfully summarize text", async () => {
      mockClient.messages.create.mockResolvedValue(mockSummaryResponse);

      const text = "This is a longer text that needs to be summarized for study purposes.";
      const result = await provider.summarize(text);

      expect(result.summary).toBe("This is a test summary of the input text.");
      expect(result.keyPoints).toHaveLength(5);
      expect(result.metadata.inputTokens).toBe(100);
      expect(result.metadata.outputTokens).toBe(50);
      expect(result.metadata.model).toBe("claude-3-sonnet-20240229");
      expect(result.metadata.cached).toBe(false);
    });

    it("should call Anthropic API with correct parameters", async () => {
      mockClient.messages.create.mockResolvedValue(mockSummaryResponse);

      const text = "Test text for summarization";
      await provider.summarize(text);

      expect(mockClient.messages.create).toHaveBeenCalledWith({
        model: "claude-3-sonnet-20240229",
        max_tokens: 500,
        temperature: 0.3,
        messages: [
          {
            role: "user",
            content: expect.stringContaining(text),
          },
        ],
      });
    });

    it("should use custom temperature if provided", async () => {
      mockClient.messages.create.mockResolvedValue(mockSummaryResponse);

      const text = "Test text";
      await provider.summarize(text, { temperature: 0.7 });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
        })
      );
    });

    it("should use custom maxKeyPoints if provided", async () => {
      mockClient.messages.create.mockResolvedValue(mockSummaryResponse);

      const text = "Test text";
      await provider.summarize(text, { maxKeyPoints: 7 });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining("7"),
            }),
          ]),
        })
      );
    });

    it("should throw error if response type is not text", async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: "image" }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const text = "Test text";
      await expect(provider.summarize(text)).rejects.toThrow(
        "Unexpected response type from Anthropic"
      );
    });

    it("should throw error if response is invalid JSON", async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: "text", text: "invalid json" }],
        usage: { input_tokens: 100, output_tokens: 50 },
      });

      const text = "Test text";
      await expect(provider.summarize(text)).rejects.toThrow();
    });

    it("should handle usage data correctly", async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              summary: "Test summary",
              keyPoints: ["Point 1", "Point 2", "Point 3"],
            }),
          },
        ],
        usage: {
          input_tokens: 250,
          output_tokens: 75,
        },
      });

      const text = "Test text";
      const result = await provider.summarize(text);

      expect(result.metadata.inputTokens).toBe(250);
      expect(result.metadata.outputTokens).toBe(75);
    });
  });

  describe("Generate Quiz", () => {
    const mockQuizResponse = {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            questions: [
              {
                question: "What is the main topic?",
                options: ["Option A", "Option B", "Option C", "Option D"],
                correctAnswer: 0,
                explanation: "This is the correct answer because...",
              },
              {
                question: "Which statement is true?",
                options: ["Option A", "Option B", "Option C", "Option D"],
                correctAnswer: 1,
                explanation: "This is correct because...",
              },
              {
                question: "What can we conclude?",
                options: ["Option A", "Option B", "Option C", "Option D"],
                correctAnswer: 2,
                explanation: "The conclusion is...",
              },
              {
                question: "How does this work?",
                options: ["Option A", "Option B", "Option C", "Option D"],
                correctAnswer: 3,
                explanation: "It works by...",
              },
            ],
          }),
        },
      ],
      usage: {
        input_tokens: 200,
        output_tokens: 150,
      },
    };

    it("should successfully generate quiz questions", async () => {
      mockClient.messages.create.mockResolvedValue(mockQuizResponse);

      const text = "This is a longer text with enough content to generate quiz questions from.";
      const result = await provider.generateQuiz(text);

      expect(result.questions).toHaveLength(4);
      expect(result.questions[0].question).toBe("What is the main topic?");
      expect(result.questions[0].options).toHaveLength(4);
      expect(result.questions[0].correctAnswer).toBe(0);
      expect(result.questions[0].explanation).toBeTruthy();
      expect(result.metadata.inputTokens).toBe(200);
      expect(result.metadata.outputTokens).toBe(150);
    });

    it("should add unique IDs to questions", async () => {
      mockClient.messages.create.mockResolvedValue(mockQuizResponse);

      const text = "Test text for quiz generation";
      const result = await provider.generateQuiz(text);

      // Check that all questions have IDs
      result.questions.forEach((q) => {
        expect(q.id).toBeTruthy();
        expect(typeof q.id).toBe("string");
      });

      // Check that IDs are unique
      const ids = result.questions.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("should call Anthropic API with correct parameters", async () => {
      mockClient.messages.create.mockResolvedValue(mockQuizResponse);

      const text = "Test text for quiz generation";
      await provider.generateQuiz(text);

      expect(mockClient.messages.create).toHaveBeenCalledWith({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1000,
        temperature: 0.5,
        messages: [
          {
            role: "user",
            content: expect.stringContaining(text),
          },
        ],
      });
    });

    it("should use custom temperature if provided", async () => {
      mockClient.messages.create.mockResolvedValue(mockQuizResponse);

      const text = "Test text";
      await provider.generateQuiz(text, { temperature: 0.8 });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.8,
        })
      );
    });

    it("should use custom questionCount if provided", async () => {
      mockClient.messages.create.mockResolvedValue(mockQuizResponse);

      const text = "Test text";
      await provider.generateQuiz(text, { questionCount: 5 });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining("5"),
            }),
          ]),
        })
      );
    });

    it("should use custom difficulty if provided", async () => {
      mockClient.messages.create.mockResolvedValue(mockQuizResponse);

      const text = "Test text";
      await provider.generateQuiz(text, { difficulty: "hard" });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining("hard"),
            }),
          ]),
        })
      );
    });

    it("should throw error if response type is not text", async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: "image" }],
        usage: { input_tokens: 200, output_tokens: 150 },
      });

      const text = "Test text";
      await expect(provider.generateQuiz(text)).rejects.toThrow(
        "Unexpected response type from Anthropic"
      );
    });

    it("should throw error if response is invalid JSON", async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [{ type: "text", text: "invalid json" }],
        usage: { input_tokens: 200, output_tokens: 150 },
      });

      const text = "Test text";
      await expect(provider.generateQuiz(text)).rejects.toThrow();
    });

    it("should handle usage data correctly", async () => {
      mockClient.messages.create.mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              questions: [
                {
                  question: "Test?",
                  options: ["A", "B", "C", "D"],
                  correctAnswer: 0,
                  explanation: "Test",
                },
                {
                  question: "Test 2?",
                  options: ["A", "B", "C", "D"],
                  correctAnswer: 1,
                  explanation: "Test 2",
                },
                {
                  question: "Test 3?",
                  options: ["A", "B", "C", "D"],
                  correctAnswer: 2,
                  explanation: "Test 3",
                },
              ],
            }),
          },
        ],
        usage: {
          input_tokens: 300,
          output_tokens: 200,
        },
      });

      const text = "Test text";
      const result = await provider.generateQuiz(text);

      expect(result.metadata.inputTokens).toBe(300);
      expect(result.metadata.outputTokens).toBe(200);
    });
  });

  describe("Error Handling", () => {
    it("should propagate Anthropic API errors", async () => {
      const apiError = new Error("API Error");
      mockClient.messages.create.mockRejectedValue(apiError);

      const text = "Test text";
      await expect(provider.summarize(text)).rejects.toThrow("API Error");
    });

    it("should handle rate limit errors", async () => {
      const rateLimitError = {
        code: "rate_limit_exceeded",
        message: "Rate limit exceeded",
      };
      mockClient.messages.create.mockRejectedValue(rateLimitError);

      const text = "Test text";
      await expect(provider.summarize(text)).rejects.toMatchObject({
        code: "rate_limit_exceeded",
      });
    });

    it("should handle timeout errors", async () => {
      const timeoutError = new Error("Request timed out");
      mockClient.messages.create.mockRejectedValue(timeoutError);

      const text = "Test text";
      await expect(provider.generateQuiz(text)).rejects.toThrow("Request timed out");
    });
  });
});
