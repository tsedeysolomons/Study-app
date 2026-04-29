/**
 * AI Service Module
 * 
 * Exports AI service types, interfaces, and adapter for unified AI provider integration.
 */

// Export all types and interfaces
export type {
  AIProvider,
  AIConfig,
  SummarizeOptions,
  SummaryResult,
  QuizOptions,
  QuizResult,
  QuizQuestion,
  AIMetadata,
  CacheEntry,
  CacheKeyComponents,
  AIError,
  AIErrorCode,
} from "./types";

export { AIErrorCodes } from "./types";

// Export the AI service adapter
export { AIServiceAdapter } from "./ai-service-adapter";
