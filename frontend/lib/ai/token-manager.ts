/**
 * Token Manager
 * 
 * Manages token usage tracking and budget enforcement for AI services.
 * Validates requests against configured token limits and tracks daily usage.
 * 
 * **Validates: Requirements 6.3, 6.4, 6.5**
 */

import { APIError } from "../errors";

/**
 * Configuration for token management
 */
export interface TokenManagerConfig {
  /** Maximum input tokens allowed per request */
  maxInputTokens: number;
  
  /** Maximum output tokens by request type */
  maxOutputTokens: {
    summary: number;
    quiz: number;
  };
  
  /** Optional daily token budget (total input + output) */
  dailyBudget?: number;
  
  /** Warning threshold as percentage of daily budget (0-1, default: 0.8) */
  warningThreshold?: number;
}

/**
 * Daily usage statistics
 */
export interface DailyUsage {
  /** Date in YYYY-MM-DD format */
  date: string;
  
  /** Total input tokens used */
  inputTokens: number;
  
  /** Total output tokens used */
  outputTokens: number;
  
  /** Total tokens (input + output) */
  totalTokens: number;
  
  /** Number of requests made */
  requestCount: number;
}

/**
 * Budget status information
 */
export interface BudgetStatus {
  /** Current daily usage */
  usage: DailyUsage;
  
  /** Daily budget limit (if configured) */
  budget?: number;
  
  /** Percentage of budget used (0-1) */
  percentageUsed?: number;
  
  /** Whether budget warning threshold is exceeded */
  warningExceeded: boolean;
  
  /** Whether budget limit is exceeded */
  limitExceeded: boolean;
  
  /** Remaining tokens in budget */
  remaining?: number;
}

/**
 * Token Manager class
 * 
 * Provides token tracking and budget enforcement for AI service requests.
 * Tracks daily usage and provides warnings when approaching budget limits.
 */
export class TokenManager {
  private config: TokenManagerConfig;
  private dailyUsage: Map<string, DailyUsage> = new Map();
  private warningThreshold: number;

  /**
   * Create a new token manager
   * @param config - Token management configuration
   */
  constructor(config: TokenManagerConfig) {
    this.config = config;
    this.warningThreshold = config.warningThreshold ?? 0.8;
    
    // Validate configuration
    if (this.warningThreshold < 0 || this.warningThreshold > 1) {
      throw new Error("Warning threshold must be between 0 and 1");
    }
  }

  /**
   * Validate a request against token limits
   * 
   * **Validates: Requirement 6.3**
   * 
   * @param text - Input text to validate
   * @param type - Request type (summary or quiz)
   * @param date - Date to check budget for (defaults to today)
   * @throws {APIError} If token limits are exceeded
   */
  validateRequest(text: string, type: "summary" | "quiz", date?: string): void {
    const tokenCount = this.estimateTokens(text);
    
    // Check input token limit (Requirement 6.3)
    if (tokenCount > this.config.maxInputTokens) {
      throw new APIError(
        "TOKEN_LIMIT_EXCEEDED",
        `Input text exceeds maximum of ${this.config.maxInputTokens} tokens (estimated ${tokenCount} tokens)`
      );
    }
    
    // Check if daily budget would be exceeded
    if (this.config.dailyBudget) {
      const checkDate = date || this.getToday();
      const currentUsage = this.getDailyUsage(checkDate);
      const maxOutputTokens = this.config.maxOutputTokens[type];
      const estimatedTotal = currentUsage.totalTokens + tokenCount + maxOutputTokens;
      
      if (estimatedTotal > this.config.dailyBudget) {
        throw new APIError(
          "TOKEN_LIMIT_EXCEEDED",
          `Request would exceed daily token budget of ${this.config.dailyBudget} tokens (current: ${currentUsage.totalTokens}, estimated: ${estimatedTotal})`
        );
      }
    }
  }

  /**
   * Track token usage for a request
   * 
   * **Validates: Requirement 6.4**
   * 
   * @param inputTokens - Number of input tokens consumed
   * @param outputTokens - Number of output tokens generated
   * @param date - Date to track usage for (defaults to today)
   */
  trackUsage(
    inputTokens: number,
    outputTokens: number,
    date: string = this.getToday()
  ): void {
    // Get or create usage entry for the date
    let usage = this.dailyUsage.get(date);
    
    if (!usage) {
      usage = {
        date,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        requestCount: 0,
      };
      this.dailyUsage.set(date, usage);
    }
    
    // Update usage statistics
    usage.inputTokens += inputTokens;
    usage.outputTokens += outputTokens;
    usage.totalTokens += inputTokens + outputTokens;
    usage.requestCount += 1;
    
    // Check budget and log warnings (Requirement 6.5)
    if (this.config.dailyBudget) {
      const percentageUsed = usage.totalTokens / this.config.dailyBudget;
      
      if (usage.totalTokens > this.config.dailyBudget) {
        console.warn(
          `[TokenManager] Daily token budget exceeded: ${usage.totalTokens}/${this.config.dailyBudget} tokens (${Math.round(percentageUsed * 100)}%)`
        );
      } else if (percentageUsed >= this.warningThreshold) {
        console.warn(
          `[TokenManager] Approaching daily token budget: ${usage.totalTokens}/${this.config.dailyBudget} tokens (${Math.round(percentageUsed * 100)}%)`
        );
      }
    }
  }

  /**
   * Get daily usage statistics
   * 
   * @param date - Date to get usage for (defaults to today)
   * @returns Daily usage statistics
   */
  getDailyUsage(date: string = this.getToday()): DailyUsage {
    const usage = this.dailyUsage.get(date);
    
    if (!usage) {
      return {
        date,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        requestCount: 0,
      };
    }
    
    return { ...usage };
  }

  /**
   * Get budget status for a date
   * 
   * **Validates: Requirement 6.5**
   * 
   * @param date - Date to check status for (defaults to today)
   * @returns Budget status information
   */
  getBudgetStatus(date: string = this.getToday()): BudgetStatus {
    const usage = this.getDailyUsage(date);
    const budget = this.config.dailyBudget;
    
    if (!budget) {
      return {
        usage,
        warningExceeded: false,
        limitExceeded: false,
      };
    }
    
    const percentageUsed = usage.totalTokens / budget;
    const remaining = Math.max(0, budget - usage.totalTokens);
    
    return {
      usage,
      budget,
      percentageUsed,
      warningExceeded: percentageUsed >= this.warningThreshold,
      limitExceeded: usage.totalTokens > budget,
      remaining,
    };
  }

  /**
   * Reset daily usage for a date
   * 
   * @param date - Date to reset (defaults to today)
   */
  resetDailyUsage(date: string = this.getToday()): void {
    this.dailyUsage.delete(date);
  }

  /**
   * Clear all usage history
   */
  clearAllUsage(): void {
    this.dailyUsage.clear();
  }

  /**
   * Get all tracked dates
   * 
   * @returns Array of dates with tracked usage
   */
  getTrackedDates(): string[] {
    return Array.from(this.dailyUsage.keys()).sort();
  }

  /**
   * Estimate token count from text
   * 
   * Uses a rough approximation: 4 characters ≈ 1 token
   * This is a conservative estimate that works reasonably well for English text.
   * 
   * @param text - Text to estimate tokens for
   * @returns Estimated token count
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get today's date in YYYY-MM-DD format
   * 
   * @returns Today's date string
   */
  private getToday(): string {
    return new Date().toISOString().split("T")[0];
  }

  /**
   * Get the current configuration
   * 
   * @returns Token manager configuration
   */
  getConfig(): Readonly<TokenManagerConfig> {
    return { 
      ...this.config,
      warningThreshold: this.warningThreshold,
    };
  }

  /**
   * Update configuration
   * 
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<TokenManagerConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (config.warningThreshold !== undefined) {
      this.warningThreshold = config.warningThreshold;
      
      if (this.warningThreshold < 0 || this.warningThreshold > 1) {
        throw new Error("Warning threshold must be between 0 and 1");
      }
    }
  }
}
