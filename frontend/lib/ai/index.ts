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

// Export AI provider implementations
export { OpenAIProvider } from "./openai-provider";
export { AnthropicProvider } from "./anthropic-provider";

// Export prompt template functions
export {
  generateSummarizationPrompt,
  generateQuizPrompt,
  substituteVariables,
  getSummarizationTemplate,
  getQuizTemplate,
} from "./prompt-templates";
export type { TemplateVariables } from "./prompt-templates";

// Export token manager
export { TokenManager } from "./token-manager";
export type {
  TokenManagerConfig,
  DailyUsage,
  BudgetStatus,
} from "./token-manager";
