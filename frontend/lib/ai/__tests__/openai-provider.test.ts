/**
 * Unit tests for OpenAI Provider
 * 
 * Tests the OpenAI provider implementation including:
 * - Summarization with JSON response format
 * - Quiz generation with question validation
 * - Token counting approximation
 * - Error handling
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { OpenAIProvider } from "../openai-provider";
import type { AIConfig } from "../types";
import OpenAI from "openai";

// Mock the OpenAI SDK
jest.mock("openai");

// Test configuration
const testConfig: AIConfig = {
  provider: "openai",
  apiKey: "test-api-key",
  model: "gpt-4",
  maxInputTokens: 4000,
  maxOutputTokens: {
    summary: 500,
    quiz: 1000,
  },
  timeout: 15000,
  cacheEnabled: true,
};

describe("OpenAIProvider", () => {
  let provider: OpenAIProvider;
  let mockClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock OpenAI client
    mockClient = {
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    };

    // Mock OpenAI constructor
    (OpenAI as any).mockImplementation(() => mockClient);

    // Create provider instance
    provider = new OpenAIProvider(testConfig);
  });

  describe("Constructor", () => {
    it("should initialize with correct configuration", () => {
      expect(provider.name).toBe("openai");
      expect(OpenAI).toHaveBeenCalledWith({
        apiKey: "test-api-key",
        timeout: 15000,
        maxRetries: 1,
      });
    });

    it("should use default model if not specified", () => {
      const configWithoutModel = { ...testConfig };
      delete (configWithoutModel as any).model;
      
      const providerWithoutModel = new OpenAIProvider(configWithoutModel);
      expect(providerWithoutModel).toBeDefined();
    });

    it("should use default timeout if not specified", () => {
      const configWithoutTimeout = { ...testConfig };
      delete (configWithoutTimeout as any).timeout;
      
      new OpenAIProvider(configWithoutTimeout);
      
      expect(OpenAI).toHaveBeenCalledWith(
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
      choices: [
        {
          message: {
            content: JSON.stringify({
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
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
      },
    };

    it("should successfully summarize text", async () => {
      mockClient.chat.completions.create.mockResolvedValue(mockSummaryResponse);

      const text = "This is a longer text that needs to be summarized for study purposes.";
      const result = await provider.summarize(text);

      expect(result.summary).toBe("This is a test summary of the input text.");
      expect(result.keyPoints).toHaveLength(5);
      expect(result.metadata.inputTokens).toBe(100);
      expect(result.metadata.outputTokens).toBe(50);
      expect(result.metadata.model).toBe("gpt-4");
      expect(result.metadata.cached).toBe(false);
    });

    it("should call OpenAI API with correct parameters", async () => {
      mockClient.chat.completions.create.mockResolvedValue(mockSummaryResponse);

      const text = "Test text for summarization";
      await provider.summarize(text);

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert study assistant. Always respond with valid JSON.",
          },
          {
            role: "user",
            content: expect.stringContaining(text),
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" },
      });
    });

    it("should use custom temperature if provided", async () => {
      mockClient.chat.completions.create.mockResolvedValue(mockSummaryResponse);

      const text = "Test text";
      await provider.summarize(text, { temperature: 0.7 });

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.7,
        })
      );
    });

    it("should use custom maxKeyPoints if provided", async () => {
      mockClient.chat.completions.create.mockResolvedValue(mockSummaryResponse);

      const text = "Test text";
      await provider.summarize(text, { maxKeyPoints: 7 });

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining("7"),
            }),
          ]),
        })
      );
    });

    it("should throw error if response is empty", async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const text = "Test text";
      await expect(provider.summarize(text)).rejects.toThrow("Empty response from OpenAI");
    });

    it("should throw error if response is invalid JSON", async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: "invalid json" } }],
      });

      const text = "Test text";
      await expect(provider.summarize(text)).rejects.toThrow();
    });

    it("should handle missing usage data", async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "Test summary",
                keyPoints: ["Point 1", "Point 2", "Point 3"],
              }),
            },
          },
        ],
        usage: undefined,
      });

      const text = "Test text";
      const result = await provider.summarize(text);

      expect(result.metadata.inputTokens).toBe(0);
      expect(result.metadata.outputTokens).toBe(0);
    });
  });

  describe("Generate Quiz", () => {
    const mockQuizResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
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
        },
      ],
      usage: {
        prompt_tokens: 200,
        completion_tokens: 150,
      },
    };

    it("should successfully generate quiz questions", async () => {
      mockClient.chat.completions.create.mockResolvedValue(mockQuizResponse);

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
      mockClient.chat.completions.create.mockResolvedValue(mockQuizResponse);

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

    it("should call OpenAI API with correct parameters", async () => {
      mockClient.chat.completions.create.mockResolvedValue(mockQuizResponse);

      const text = "Test text for quiz generation";
      await provider.generateQuiz(text);

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert educator. Always respond with valid JSON.",
          },
          {
            role: "user",
            content: expect.stringContaining(text),
          },
        ],
        temperature: 0.5,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      });
    });

    it("should use custom temperature if provided", async () => {
      mockClient.chat.completions.create.mockResolvedValue(mockQuizResponse);

      const text = "Test text";
      await provider.generateQuiz(text, { temperature: 0.8 });

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.8,
        })
      );
    });

    it("should use custom questionCount if provided", async () => {
      mockClient.chat.completions.create.mockResolvedValue(mockQuizResponse);

      const text = "Test text";
      await provider.generateQuiz(text, { questionCount: 5 });

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
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
      mockClient.chat.completions.create.mockResolvedValue(mockQuizResponse);

      const text = "Test text";
      await provider.generateQuiz(text, { difficulty: "hard" });

      expect(mockClient.chat.completions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining("hard"),
            }),
          ]),
        })
      );
    });

    it("should throw error if response is empty", async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const text = "Test text";
      await expect(provider.generateQuiz(text)).rejects.toThrow("Empty response from OpenAI");
    });

    it("should throw error if response is invalid JSON", async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: "invalid json" } }],
      });

      const text = "Test text";
      await expect(provider.generateQuiz(text)).rejects.toThrow();
    });

    it("should handle missing usage data", async () => {
      mockClient.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
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
          },
        ],
        usage: undefined,
      });

      const text = "Test text";
      const result = await provider.generateQuiz(text);

      expect(result.metadata.inputTokens).toBe(0);
      expect(result.metadata.outputTokens).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("should propagate OpenAI API errors", async () => {
      const apiError = new Error("API Error");
      mockClient.chat.completions.create.mockRejectedValue(apiError);

      const text = "Test text";
      await expect(provider.summarize(text)).rejects.toThrow("API Error");
    });

    it("should handle rate limit errors", async () => {
      const rateLimitError = {
        code: "rate_limit_exceeded",
        message: "Rate limit exceeded",
      };
      mockClient.chat.completions.create.mockRejectedValue(rateLimitError);

      const text = "Test text";
      await expect(provider.summarize(text)).rejects.toMatchObject({
        code: "rate_limit_exceeded",
      });
    });

    it("should handle timeout errors", async () => {
      const timeoutError = new Error("Request timed out");
      mockClient.chat.completions.create.mockRejectedValue(timeoutError);

      const text = "Test text";
      await expect(provider.generateQuiz(text)).rejects.toThrow("Request timed out");
    });
  });
});
