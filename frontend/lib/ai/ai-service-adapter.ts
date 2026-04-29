/**
 * AI Service Adapter
 * 
 * Provides a unified interface for AI service providers (OpenAI, Anthropic).
 * Handles input validation, token counting, caching, and error handling.
 * 
 * **Validates: Requirements 4.4, 2.4, 2.8**
 */

import { createHash } from "crypto";
import { APIError } from "../errors";
import type {
  AIProvider,
  AIConfig,
  SummarizeOptions,
  SummaryResult,
  QuizOptions,
  QuizResult,
  CacheKeyComponents,
  AIErrorCode,
} from "./types";

/**
 * AI Service Adapter class
 * 
 * Provides a unified interface for multiple AI providers with:
 * - Input validation and token counting
 * - Cache integration hooks
 * - Error handling and retry logic
 * - Response validation
 */
export class AIServiceAdapter {
  private provider: AIProvider;
  private config: AIConfig;
  private cacheCheckFn?: (key: string) => Promise<any | null>;
  private cacheStoreFn?: (key: string, value: any) => Promise<void>;

  /**
   * Create a new AI service adapter
   * @param provider - AI provider implementation (OpenAI or Anthropic)
   * @param config - Configuration for the adapter
   */
  constructor(provider: AIProvider, config: AIConfig) {
    this.provider = provider;
    this.config = config;
  }

  /**
   * Set cache integration functions
   * @param checkFn - Function to check cache for a key
   * @param storeFn - Function to store a value in cache
   */
  setCacheIntegration(
    checkFn: (key: string) => Promise<any | null>,
    storeFn: (key: string, value: any) => Promise<void>
  ): void {
    this.cacheCheckFn = checkFn;
    this.cacheStoreFn = storeFn;
  }

  /**
   * Generate a summary and key points from input text
   * 
   * **Validates: Requirements 2.4, 2.8**
   * 
   * @param text - Input text to summarize
   * @param options - Optional summarization parameters
   * @returns Summary result with metadata
   * @throws {APIError} If input is invalid or service fails
   */
  async summarize(
    text: string,
    options?: SummarizeOptions
  ): Promise<SummaryResult> {
    // Validate input (Requirement 2.4)
    this.validateInput(text, this.config.maxInputTokens);

    // Validate text length (Requirement 2.3)
    if (text.trim().length < 50) {
      // Return original text as summary for short inputs
      return {
        summary: text,
        keyPoints: [],
        metadata: {
          inputTokens: this.provider.countTokens(text),
          outputTokens: 0,
          model: this.config.model,
          cached: false,
          processingTime: 0,
        },
      };
    }

    // Check cache if enabled
    if (this.config.cacheEnabled && this.cacheCheckFn) {
      const cacheKey = this.generateCacheKey("summary", text, options);
      const cached = await this.cacheCheckFn(cacheKey);
      
      if (cached) {
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cached: true,
          },
        };
      }
    }

    // Call provider
    const startTime = Date.now();
    try {
      const result = await this.provider.summarize(text, options);
      const processingTime = Date.now() - startTime;

      // Validate response (Requirement 2.8)
      this.validateSummaryResponse(result);

      // Update metadata
      const finalResult: SummaryResult = {
        ...result,
        metadata: {
          ...result.metadata,
          cached: false,
          processingTime,
        },
      };

      // Store in cache if enabled
      if (this.config.cacheEnabled && this.cacheStoreFn) {
        const cacheKey = this.generateCacheKey("summary", text, options);
        await this.cacheStoreFn(cacheKey, finalResult);
      }

      return finalResult;
    } catch (error) {
      throw this.handleAIError(error);
    }
  }

  /**
   * Generate quiz questions from input text
   * 
   * **Validates: Requirements 2.4, 2.8**
   * 
   * @param text - Input text to generate questions from
   * @param options - Optional quiz generation parameters
   * @returns Quiz result with questions and metadata
   * @throws {APIError} If input is invalid or service fails
   */
  async generateQuiz(
    text: string,
    options?: QuizOptions
  ): Promise<QuizResult> {
    // Validate input (Requirement 2.4)
    this.validateInput(text, this.config.maxInputTokens);

    // Validate minimum text length (Requirement 3.5)
    if (text.trim().length < 100) {
      throw new APIError(
        "INVALID_INPUT",
        "Text must be at least 100 characters to generate quiz questions"
      );
    }

    // Check cache if enabled
    if (this.config.cacheEnabled && this.cacheCheckFn) {
      const cacheKey = this.generateCacheKey("quiz", text, options);
      const cached = await this.cacheCheckFn(cacheKey);
      
      if (cached) {
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cached: true,
          },
        };
      }
    }

    // Call provider
    const startTime = Date.now();
    try {
      const result = await this.provider.generateQuiz(text, options);
      const processingTime = Date.now() - startTime;

      // Validate response (Requirement 3.7)
      this.validateQuizResponse(result);

      // Update metadata
      const finalResult: QuizResult = {
        ...result,
        metadata: {
          ...result.metadata,
          cached: false,
          processingTime,
        },
      };

      // Store in cache if enabled
      if (this.config.cacheEnabled && this.cacheStoreFn) {
        const cacheKey = this.generateCacheKey("quiz", text, options);
        await this.cacheStoreFn(cacheKey, finalResult);
      }

      return finalResult;
    } catch (error) {
      throw this.handleAIError(error);
    }
  }

  /**
   * Count tokens in input text
   * @param text - Text to count tokens for
   * @returns Approximate token count
   */
  countTokens(text: string): number {
    return this.provider.countTokens(text);
  }

  /**
   * Get the current provider name
   * @returns Provider name
   */
  getProviderName(): "openai" | "anthropic" {
    return this.provider.name;
  }

  /**
   * Get the current model name
   * @returns Model name
   */
  getModelName(): string {
    return this.config.model;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Validate input text and token count
   * 
   * **Validates: Requirement 2.4**
   * 
   * @param text - Input text to validate
   * @param maxTokens - Maximum allowed tokens
   * @throws {APIError} If input is invalid
   */
  private validateInput(text: string, maxTokens: number): void {
    // Check for empty input (Requirement 2.8)
    if (!text || text.trim().length === 0) {
      throw new APIError("INVALID_INPUT", "Text cannot be empty");
    }

    // Check token limit (Requirement 2.4)
    const tokenCount = this.provider.countTokens(text);
    if (tokenCount > maxTokens) {
      throw new APIError(
        "TOKEN_LIMIT_EXCEEDED",
        `Input exceeds maximum token limit of ${maxTokens} (got ${tokenCount} tokens)`
      );
    }
  }

  /**
   * Validate summary response structure
   * 
   * **Validates: Requirement 2.8**
   * 
   * @param result - Summary result to validate
   * @throws {APIError} If response is invalid
   */
  private validateSummaryResponse(result: SummaryResult): void {
    if (!result.summary || typeof result.summary !== "string") {
      throw new APIError(
        "INVALID_AI_RESPONSE",
        "AI response missing or invalid summary field"
      );
    }

    if (!Array.isArray(result.keyPoints)) {
      throw new APIError(
        "INVALID_AI_RESPONSE",
        "AI response missing or invalid keyPoints field"
      );
    }

    // Validate key points count (Requirement 2.2)
    if (result.keyPoints.length < 3 || result.keyPoints.length > 7) {
      throw new APIError(
        "INVALID_AI_RESPONSE",
        `AI response must contain 3-7 key points (got ${result.keyPoints.length})`
      );
    }
  }

  /**
   * Validate quiz response structure
   * 
   * **Validates: Requirement 3.7**
   * 
   * @param result - Quiz result to validate
   * @throws {APIError} If response is invalid
   */
  private validateQuizResponse(result: QuizResult): void {
    if (!result.questions || !Array.isArray(result.questions)) {
      throw new APIError(
        "INVALID_AI_RESPONSE",
        "AI response missing or invalid questions field"
      );
    }

    if (result.questions.length === 0) {
      throw new APIError("INVALID_AI_RESPONSE", "No questions generated");
    }

    // Validate question count (Requirement 3.1)
    if (result.questions.length < 3 || result.questions.length > 5) {
      throw new APIError(
        "INVALID_AI_RESPONSE",
        `AI response must contain 3-5 questions (got ${result.questions.length})`
      );
    }

    // Validate each question structure (Requirement 3.2, 3.3)
    for (const q of result.questions) {
      if (!q.id || typeof q.id !== "string") {
        throw new APIError(
          "INVALID_AI_RESPONSE",
          "Question missing or invalid id field"
        );
      }

      if (!q.question || typeof q.question !== "string") {
        throw new APIError(
          "INVALID_AI_RESPONSE",
          "Question missing or invalid question field"
        );
      }

      if (!Array.isArray(q.options) || q.options.length !== 4) {
        throw new APIError(
          "INVALID_AI_RESPONSE",
          "Question must have exactly 4 options"
        );
      }

      if (
        typeof q.correctAnswer !== "number" ||
        q.correctAnswer < 0 ||
        q.correctAnswer > 3
      ) {
        throw new APIError(
          "INVALID_AI_RESPONSE",
          "Question correctAnswer must be between 0 and 3"
        );
      }

      if (!q.explanation || typeof q.explanation !== "string") {
        throw new APIError(
          "INVALID_AI_RESPONSE",
          "Question missing or invalid explanation field"
        );
      }
    }
  }

  /**
   * Generate a cache key from request components
   * 
   * Uses SHA-256 hashing to create a unique key from:
   * - Request type (summary or quiz)
   * - Input text
   * - Request options
   * 
   * @param type - Request type
   * @param text - Input text
   * @param options - Request options
   * @returns SHA-256 hash as cache key
   */
  private generateCacheKey(
    type: "summary" | "quiz",
    text: string,
    options?: SummarizeOptions | QuizOptions
  ): string {
    const components: CacheKeyComponents = {
      type,
      text,
      options,
    };
    
    const data = JSON.stringify(components);
    return createHash("sha256").update(data).digest("hex");
  }

  /**
   * Handle AI service errors and convert to APIError
   * 
   * @param error - Error from AI service
   * @returns APIError with appropriate code and message
   */
  private handleAIError(error: any): APIError {
    // Handle rate limit errors
    if (
      error.code === "rate_limit_exceeded" ||
      error.status === 429 ||
      error.message?.includes("rate limit")
    ) {
      return new APIError(
        "AI_RATE_LIMIT",
        "AI service rate limit exceeded. Please try again later.",
        { retryAfter: 60 }
      );
    }

    // Handle timeout errors
    if (
      error.code === "timeout" ||
      error.code === "ETIMEDOUT" ||
      error.message?.includes("timeout")
    ) {
      return new APIError(
        "AI_TIMEOUT",
        "AI service request timed out. Please try again."
      );
    }

    // Handle invalid response errors
    if (error.code === "INVALID_AI_RESPONSE") {
      return error as APIError;
    }

    // Handle input validation errors
    if (
      error.code === "INVALID_INPUT" ||
      error.code === "TOKEN_LIMIT_EXCEEDED"
    ) {
      return error as APIError;
    }

    // Generic AI service error
    return new APIError(
      "AI_SERVICE_ERROR",
      "AI service encountered an error. Please try again.",
      { details: error.message }
    );
  }
}
