/**
 * AI Service Types and Interfaces
 * 
 * Defines the core types and interfaces for AI service integration.
 * Supports multiple AI providers (OpenAI, Anthropic) through a unified interface.
 */

// ============================================================================
// Core AI Provider Interface
// ============================================================================

/**
 * Unified interface for AI service providers.
 * Implementations must support both OpenAI and Anthropic.
 */
export interface AIProvider {
  /** Provider name identifier */
  name: "openai" | "anthropic";
  
  /**
   * Generate a summary and key points from input text
   * @param text - Input text to summarize
   * @param options - Optional summarization parameters
   * @returns Summary result with metadata
   */
  summarize(text: string, options?: SummarizeOptions): Promise<SummaryResult>;
  
  /**
   * Generate quiz questions from input text
   * @param text - Input text to generate questions from
   * @param options - Optional quiz generation parameters
   * @returns Quiz result with questions and metadata
   */
  generateQuiz(text: string, options?: QuizOptions): Promise<QuizResult>;
  
  /**
   * Count tokens in the input text
   * @param text - Text to count tokens for
   * @returns Approximate token count
   */
  countTokens(text: string): number;
}

// ============================================================================
// Summarization Types
// ============================================================================

/**
 * Options for text summarization
 */
export interface SummarizeOptions {
  /** Maximum number of key points to extract (3-7, default: 5) */
  maxKeyPoints?: number;
  
  /** Temperature for AI generation (0-1, default: 0.3) */
  temperature?: number;
}

/**
 * Result from text summarization
 */
export interface SummaryResult {
  /** Generated summary text */
  summary: string;
  
  /** Extracted key points */
  keyPoints: string[];
  
  /** Metadata about the AI request */
  metadata: AIMetadata;
}

// ============================================================================
// Quiz Generation Types
// ============================================================================

/**
 * Options for quiz generation
 */
export interface QuizOptions {
  /** Number of questions to generate (3-5, default: 4) */
  questionCount?: number;
  
  /** Difficulty level (default: "medium") */
  difficulty?: "easy" | "medium" | "hard";
  
  /** Temperature for AI generation (0-1, default: 0.5) */
  temperature?: number;
}

/**
 * Result from quiz generation
 */
export interface QuizResult {
  /** Generated quiz questions */
  questions: QuizQuestion[];
  
  /** Metadata about the AI request */
  metadata: AIMetadata;
}

/**
 * A single quiz question with multiple choice options
 */
export interface QuizQuestion {
  /** Unique identifier for the question */
  id: string;
  
  /** The question text */
  question: string;
  
  /** Exactly 4 answer options */
  options: [string, string, string, string];
  
  /** Index of the correct answer (0-3) */
  correctAnswer: number;
  
  /** Explanation of why the answer is correct */
  explanation: string;
}

// ============================================================================
// AI Metadata Types
// ============================================================================

/**
 * Metadata about an AI service request
 */
export interface AIMetadata {
  /** Number of input tokens consumed */
  inputTokens: number;
  
  /** Number of output tokens generated */
  outputTokens: number;
  
  /** AI model used for generation */
  model: string;
  
  /** Whether the response was served from cache */
  cached: boolean;
  
  /** Processing time in milliseconds */
  processingTime: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration for AI service adapter
 */
export interface AIConfig {
  /** AI provider to use */
  provider: "openai" | "anthropic";
  
  /** API key for the provider */
  apiKey: string;
  
  /** Model name to use */
  model: string;
  
  /** Maximum input tokens allowed */
  maxInputTokens: number;
  
  /** Maximum output tokens for different request types */
  maxOutputTokens: {
    summary: number;
    quiz: number;
  };
  
  /** Request timeout in milliseconds (default: 15000) */
  timeout?: number;
  
  /** Whether caching is enabled */
  cacheEnabled?: boolean;
}

// ============================================================================
// Cache Types
// ============================================================================

/**
 * Cache entry for AI responses
 */
export interface CacheEntry<T> {
  /** Cache key (SHA-256 hash) */
  key: string;
  
  /** Cached value */
  value: T;
  
  /** Timestamp when cached (milliseconds since epoch) */
  timestamp: number;
  
  /** Time-to-live in milliseconds */
  ttl: number;
}

/**
 * Cache key components for generating unique cache keys
 */
export interface CacheKeyComponents {
  /** Request type */
  type: "summary" | "quiz";
  
  /** Input text */
  text: string;
  
  /** Request options */
  options?: SummarizeOptions | QuizOptions;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * AI service error codes
 */
export const AIErrorCodes = {
  INVALID_INPUT: "INVALID_INPUT",
  TOKEN_LIMIT_EXCEEDED: "TOKEN_LIMIT_EXCEEDED",
  AI_SERVICE_ERROR: "AI_SERVICE_ERROR",
  AI_RATE_LIMIT: "AI_RATE_LIMIT",
  AI_TIMEOUT: "AI_TIMEOUT",
  INVALID_AI_RESPONSE: "INVALID_AI_RESPONSE",
} as const;

export type AIErrorCode = (typeof AIErrorCodes)[keyof typeof AIErrorCodes];

/**
 * AI service error with additional context
 */
export interface AIError extends Error {
  code: AIErrorCode;
  details?: any;
  retryAfter?: number;
}
