/**
 * OpenAI Provider Implementation
 * 
 * Implements the AIProvider interface for OpenAI's GPT models.
 * Provides text summarization and quiz generation with JSON response format.
 * 
 * **Validates: Requirements 4.2, 2.1, 3.1**
 */

import OpenAI from "openai";
import type {
  AIProvider,
  AIConfig,
  SummarizeOptions,
  SummaryResult,
  QuizOptions,
  QuizResult,
} from "./types";
import {
  generateSummarizationPrompt,
  generateQuizPrompt,
} from "./prompt-templates";

/**
 * OpenAI Provider Implementation
 * 
 * Implements the AIProvider interface using OpenAI's GPT models.
 * Supports GPT-4 and GPT-3.5-turbo with JSON response format.
 * 
 * **Validates: Requirements 4.2, 2.1, 3.1**
 */
export class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;
  private client: OpenAI;
  private model: string;

  /**
   * Create a new OpenAI provider instance
   * 
   * @param config - AI configuration with API key and model settings
   */
  constructor(config: AIConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: config.timeout || 15000,
      maxRetries: 1,
    });
    this.model = config.model || "gpt-4";
  }

  /**
   * Generate a summary and key points from input text
   * 
   * Uses OpenAI's chat completion API with JSON response format.
   * Temperature is set low (0.3) for consistent, factual summaries.
   * 
   * **Validates: Requirement 2.1**
   * 
   * @param text - Input text to summarize
   * @param options - Optional summarization parameters
   * @returns Summary result with metadata
   * @throws {Error} If OpenAI API call fails or returns invalid response
   */
  async summarize(
    text: string,
    options?: SummarizeOptions
  ): Promise<SummaryResult> {
    const prompt = generateSummarizationPrompt(text, options);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are an expert study assistant. Always respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: options?.temperature ?? 0.3,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const parsed = JSON.parse(content);

    return {
      summary: parsed.summary,
      keyPoints: parsed.keyPoints,
      metadata: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        model: this.model,
        cached: false,
        processingTime: 0, // Set by adapter
      },
    };
  }

  /**
   * Generate quiz questions from input text
   * 
   * Uses OpenAI's chat completion API with JSON response format.
   * Temperature is set moderate (0.5) for creative but consistent questions.
   * Adds unique IDs to each question for tracking.
   * 
   * **Validates: Requirement 3.1**
   * 
   * @param text - Input text to generate questions from
   * @param options - Optional quiz generation parameters
   * @returns Quiz result with questions and metadata
   * @throws {Error} If OpenAI API call fails or returns invalid response
   */
  async generateQuiz(
    text: string,
    options?: QuizOptions
  ): Promise<QuizResult> {
    const prompt = generateQuizPrompt(text, options);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: "system",
          content: "You are an expert educator. Always respond with valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: options?.temperature ?? 0.5,
      max_tokens: 1000,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI");
    }

    const parsed = JSON.parse(content);

    // Add unique IDs to questions (Requirement 3.10)
    const questions = parsed.questions.map((q: any, index: number) => ({
      ...q,
      id: `${Date.now()}-${index}`,
    }));

    return {
      questions,
      metadata: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
        model: this.model,
        cached: false,
        processingTime: 0, // Set by adapter
      },
    };
  }

  /**
   * Count tokens in input text
   * 
   * Uses a simple approximation: 4 characters ≈ 1 token for English text.
   * This is sufficient for token budget enforcement.
   * 
   * **Validates: Requirement 4.2**
   * 
   * @param text - Text to count tokens for
   * @returns Approximate token count
   */
  countTokens(text: string): number {
    // Approximate token count (4 chars ≈ 1 token for English)
    return Math.ceil(text.length / 4);
  }
}
