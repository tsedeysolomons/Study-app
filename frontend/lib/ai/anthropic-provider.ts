/**
 * Anthropic Provider Implementation
 * 
 * Implements the AIProvider interface for Anthropic's Claude models.
 * Provides text summarization and quiz generation with JSON response format.
 * 
 * **Validates: Requirements 4.2, 2.1, 3.1**
 */

import Anthropic from "@anthropic-ai/sdk";
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
 * Anthropic Provider Implementation
 * 
 * Implements the AIProvider interface using Anthropic's Claude models.
 * Supports Claude-3-Sonnet and other Claude models with JSON response parsing.
 * 
 * **Validates: Requirements 4.2, 2.1, 3.1**
 */
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic" as const;
  private client: Anthropic;
  private model: string;

  /**
   * Create a new Anthropic provider instance
   * 
   * @param config - AI configuration with API key and model settings
   */
  constructor(config: AIConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      timeout: config.timeout || 15000,
      maxRetries: 1,
    });
    this.model = config.model || "claude-3-sonnet-20240229";
  }

  /**
   * Generate a summary and key points from input text
   * 
   * Uses Anthropic's messages API with JSON response parsing.
   * Temperature is set low (0.3) for consistent, factual summaries.
   * 
   * **Validates: Requirement 2.1**
   * 
   * @param text - Input text to summarize
   * @param options - Optional summarization parameters
   * @returns Summary result with metadata
   * @throws {Error} If Anthropic API call fails or returns invalid response
   */
  async summarize(
    text: string,
    options?: SummarizeOptions
  ): Promise<SummaryResult> {
    const prompt = generateSummarizationPrompt(text, options);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 500,
      temperature: options?.temperature ?? 0.3,
      messages: [
        { role: "user", content: prompt },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Anthropic");
    }

    const parsed = JSON.parse(content.text);

    return {
      summary: parsed.summary,
      keyPoints: parsed.keyPoints,
      metadata: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: this.model,
        cached: false,
        processingTime: 0, // Set by adapter
      },
    };
  }

  /**
   * Generate quiz questions from input text
   * 
   * Uses Anthropic's messages API with JSON response parsing.
   * Temperature is set moderate (0.5) for creative but consistent questions.
   * Adds unique IDs to each question for tracking.
   * 
   * **Validates: Requirement 3.1**
   * 
   * @param text - Input text to generate questions from
   * @param options - Optional quiz generation parameters
   * @returns Quiz result with questions and metadata
   * @throws {Error} If Anthropic API call fails or returns invalid response
   */
  async generateQuiz(
    text: string,
    options?: QuizOptions
  ): Promise<QuizResult> {
    const prompt = generateQuizPrompt(text, options);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1000,
      temperature: options?.temperature ?? 0.5,
      messages: [
        { role: "user", content: prompt },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Anthropic");
    }

    const parsed = JSON.parse(content.text);

    // Add unique IDs to questions (Requirement 3.10)
    const questions = parsed.questions.map((q: any, index: number) => ({
      ...q,
      id: `${Date.now()}-${index}`,
    }));

    return {
      questions,
      metadata: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
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
