/**
 * Unit tests for Token Manager
 * 
 * Tests token tracking, budget enforcement, and validation functionality.
 * 
 * **Validates: Requirements 6.3, 6.4, 6.5**
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { TokenManager, TokenManagerConfig } from "../token-manager";
import { APIError } from "../../errors";

// Test configuration
const testConfig: TokenManagerConfig = {
  maxInputTokens: 4000,
  maxOutputTokens: {
    summary: 500,
    quiz: 1000,
  },
  dailyBudget: 10000,
  warningThreshold: 0.8,
};

describe("TokenManager", () => {
  let tokenManager: TokenManager;

  beforeEach(() => {
    tokenManager = new TokenManager(testConfig);
  });

  describe("Constructor and Configuration", () => {
    it("should initialize with valid configuration", () => {
      expect(tokenManager).toBeDefined();
      expect(tokenManager.getConfig()).toEqual(testConfig);
    });

    it("should use default warning threshold if not provided", () => {
      const manager = new TokenManager({
        maxInputTokens: 4000,
        maxOutputTokens: { summary: 500, quiz: 1000 },
      });
      
      expect(manager.getConfig().warningThreshold).toBe(0.8);
    });

    it("should reject invalid warning threshold (< 0)", () => {
      expect(() => {
        new TokenManager({
          maxInputTokens: 4000,
          maxOutputTokens: { summary: 500, quiz: 1000 },
          warningThreshold: -0.1,
        });
      }).toThrow("Warning threshold must be between 0 and 1");
    });

    it("should reject invalid warning threshold (> 1)", () => {
      expect(() => {
        new TokenManager({
          maxInputTokens: 4000,
          maxOutputTokens: { summary: 500, quiz: 1000 },
          warningThreshold: 1.5,
        });
      }).toThrow("Warning threshold must be between 0 and 1");
    });

    it("should allow updating configuration", () => {
      tokenManager.updateConfig({ maxInputTokens: 5000 });
      expect(tokenManager.getConfig().maxInputTokens).toBe(5000);
    });

    it("should reject invalid warning threshold in update", () => {
      expect(() => {
        tokenManager.updateConfig({ warningThreshold: 2.0 });
      }).toThrow("Warning threshold must be between 0 and 1");
    });
  });

  describe("Token Estimation", () => {
    it("should estimate tokens correctly (4 chars = 1 token)", () => {
      const text = "This is a test text";
      const estimated = tokenManager.estimateTokens(text);
      
      expect(estimated).toBe(Math.ceil(text.length / 4));
    });

    it("should handle empty text", () => {
      expect(tokenManager.estimateTokens("")).toBe(0);
    });

    it("should handle very long text", () => {
      const longText = "a".repeat(20000);
      const estimated = tokenManager.estimateTokens(longText);
      
      expect(estimated).toBe(5000);
    });

    it("should round up fractional tokens", () => {
      const text = "abc"; // 3 chars = 0.75 tokens
      expect(tokenManager.estimateTokens(text)).toBe(1);
    });
  });

  describe("Request Validation - Input Token Limits", () => {
    it("should accept text within token limit", () => {
      const text = "a".repeat(4000); // ~1000 tokens
      
      expect(() => {
        tokenManager.validateRequest(text, "summary");
      }).not.toThrow();
    });

    it("should reject text exceeding input token limit", () => {
      const text = "a".repeat(20000); // ~5000 tokens
      
      expect(() => {
        tokenManager.validateRequest(text, "summary");
      }).toThrow(APIError);
      
      expect(() => {
        tokenManager.validateRequest(text, "summary");
      }).toThrow("exceeds maximum of 4000 tokens");
    });

    it("should validate against maxInputTokens for summary requests", () => {
      const text = "a".repeat(16001); // 4001 tokens
      
      expect(() => {
        tokenManager.validateRequest(text, "summary");
      }).toThrow(APIError);
    });

    it("should validate against maxInputTokens for quiz requests", () => {
      const text = "a".repeat(16001); // 4001 tokens
      
      expect(() => {
        tokenManager.validateRequest(text, "quiz");
      }).toThrow(APIError);
    });
  });

  describe("Request Validation - Daily Budget", () => {
    it("should accept request within daily budget", () => {
      const text = "a".repeat(4000); // ~1000 tokens
      
      expect(() => {
        tokenManager.validateRequest(text, "summary");
      }).not.toThrow();
    });

    it("should reject request that would exceed daily budget", () => {
      // Use 9000 tokens first
      tokenManager.trackUsage(4500, 4500, "2024-01-15");
      
      // Try to use 2000 more (would exceed 10000 budget)
      const text = "a".repeat(6000); // ~1500 tokens + 500 output = 2000 total
      
      expect(() => {
        tokenManager.validateRequest(text, "summary", "2024-01-15");
      }).toThrow(APIError);
      
      expect(() => {
        tokenManager.validateRequest(text, "summary", "2024-01-15");
      }).toThrow("exceed daily token budget");
    });

    it("should consider output tokens in budget calculation", () => {
      // Use 8500 tokens
      tokenManager.trackUsage(4250, 4250, "2024-01-15");
      
      // Try quiz (1000 input + 1000 output = 2000, would exceed 10000)
      const text = "a".repeat(4000); // ~1000 tokens
      
      expect(() => {
        tokenManager.validateRequest(text, "quiz", "2024-01-15");
      }).toThrow(APIError);
    });

    it("should allow validation when no daily budget is set", () => {
      const noBudgetManager = new TokenManager({
        maxInputTokens: 4000,
        maxOutputTokens: { summary: 500, quiz: 1000 },
      });
      
      const text = "a".repeat(4000); // ~1000 tokens
      
      expect(() => {
        noBudgetManager.validateRequest(text, "summary");
      }).not.toThrow();
    });
  });

  describe("Usage Tracking", () => {
    it("should track input and output tokens", () => {
      tokenManager.trackUsage(100, 50);
      
      const usage = tokenManager.getDailyUsage();
      expect(usage.inputTokens).toBe(100);
      expect(usage.outputTokens).toBe(50);
      expect(usage.totalTokens).toBe(150);
      expect(usage.requestCount).toBe(1);
    });

    it("should accumulate usage across multiple requests", () => {
      tokenManager.trackUsage(100, 50);
      tokenManager.trackUsage(200, 100);
      tokenManager.trackUsage(150, 75);
      
      const usage = tokenManager.getDailyUsage();
      expect(usage.inputTokens).toBe(450);
      expect(usage.outputTokens).toBe(225);
      expect(usage.totalTokens).toBe(675);
      expect(usage.requestCount).toBe(3);
    });

    it("should track usage for specific dates", () => {
      tokenManager.trackUsage(100, 50, "2024-01-15");
      tokenManager.trackUsage(200, 100, "2024-01-16");
      
      const usage15 = tokenManager.getDailyUsage("2024-01-15");
      const usage16 = tokenManager.getDailyUsage("2024-01-16");
      
      expect(usage15.totalTokens).toBe(150);
      expect(usage16.totalTokens).toBe(300);
    });

    it("should return zero usage for dates with no tracking", () => {
      const usage = tokenManager.getDailyUsage("2024-01-15");
      
      expect(usage.inputTokens).toBe(0);
      expect(usage.outputTokens).toBe(0);
      expect(usage.totalTokens).toBe(0);
      expect(usage.requestCount).toBe(0);
      expect(usage.date).toBe("2024-01-15");
    });

    it("should track usage for today by default", () => {
      const today = new Date().toISOString().split("T")[0];
      
      tokenManager.trackUsage(100, 50);
      
      const usage = tokenManager.getDailyUsage();
      expect(usage.date).toBe(today);
      expect(usage.totalTokens).toBe(150);
    });
  });

  describe("Budget Status", () => {
    it("should return correct budget status within limits", () => {
      tokenManager.trackUsage(1000, 500);
      
      const status = tokenManager.getBudgetStatus();
      
      expect(status.usage.totalTokens).toBe(1500);
      expect(status.budget).toBe(10000);
      expect(status.percentageUsed).toBe(0.15);
      expect(status.warningExceeded).toBe(false);
      expect(status.limitExceeded).toBe(false);
      expect(status.remaining).toBe(8500);
    });

    it("should detect warning threshold exceeded", () => {
      tokenManager.trackUsage(4000, 4100); // 8100 tokens = 81%
      
      const status = tokenManager.getBudgetStatus();
      
      expect(status.percentageUsed).toBe(0.81);
      expect(status.warningExceeded).toBe(true);
      expect(status.limitExceeded).toBe(false);
    });

    it("should detect budget limit exceeded", () => {
      tokenManager.trackUsage(6000, 5000); // 11000 tokens
      
      const status = tokenManager.getBudgetStatus();
      
      expect(status.percentageUsed).toBeGreaterThan(1);
      expect(status.warningExceeded).toBe(true);
      expect(status.limitExceeded).toBe(true);
      expect(status.remaining).toBe(0);
    });

    it("should handle status when no budget is set", () => {
      const noBudgetManager = new TokenManager({
        maxInputTokens: 4000,
        maxOutputTokens: { summary: 500, quiz: 1000 },
      });
      
      noBudgetManager.trackUsage(1000, 500);
      
      const status = noBudgetManager.getBudgetStatus();
      
      expect(status.budget).toBeUndefined();
      expect(status.percentageUsed).toBeUndefined();
      expect(status.warningExceeded).toBe(false);
      expect(status.limitExceeded).toBe(false);
      expect(status.remaining).toBeUndefined();
    });

    it("should return status for specific dates", () => {
      tokenManager.trackUsage(1000, 500, "2024-01-15");
      tokenManager.trackUsage(2000, 1000, "2024-01-16");
      
      const status15 = tokenManager.getBudgetStatus("2024-01-15");
      const status16 = tokenManager.getBudgetStatus("2024-01-16");
      
      expect(status15.usage.totalTokens).toBe(1500);
      expect(status16.usage.totalTokens).toBe(3000);
    });
  });

  describe("Budget Warnings", () => {
    it("should log warning when approaching budget", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      
      tokenManager.trackUsage(4000, 4100); // 81% of budget
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Approaching daily token budget")
      );
      
      consoleSpy.mockRestore();
    });

    it("should log warning when budget exceeded", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      
      tokenManager.trackUsage(6000, 5000); // 110% of budget
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Daily token budget exceeded")
      );
      
      consoleSpy.mockRestore();
    });

    it("should not log warning when below threshold", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      
      tokenManager.trackUsage(1000, 500); // 15% of budget
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it("should not log warning when no budget is set", () => {
      const noBudgetManager = new TokenManager({
        maxInputTokens: 4000,
        maxOutputTokens: { summary: 500, quiz: 1000 },
      });
      
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
      
      noBudgetManager.trackUsage(10000, 10000);
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe("Usage Management", () => {
    it("should reset daily usage for a specific date", () => {
      tokenManager.trackUsage(1000, 500, "2024-01-15");
      tokenManager.trackUsage(2000, 1000, "2024-01-16");
      
      tokenManager.resetDailyUsage("2024-01-15");
      
      const usage15 = tokenManager.getDailyUsage("2024-01-15");
      const usage16 = tokenManager.getDailyUsage("2024-01-16");
      
      expect(usage15.totalTokens).toBe(0);
      expect(usage16.totalTokens).toBe(3000);
    });

    it("should clear all usage history", () => {
      tokenManager.trackUsage(1000, 500, "2024-01-15");
      tokenManager.trackUsage(2000, 1000, "2024-01-16");
      tokenManager.trackUsage(1500, 750, "2024-01-17");
      
      tokenManager.clearAllUsage();
      
      expect(tokenManager.getTrackedDates()).toHaveLength(0);
      expect(tokenManager.getDailyUsage("2024-01-15").totalTokens).toBe(0);
    });

    it("should return tracked dates in sorted order", () => {
      tokenManager.trackUsage(100, 50, "2024-01-17");
      tokenManager.trackUsage(100, 50, "2024-01-15");
      tokenManager.trackUsage(100, 50, "2024-01-16");
      
      const dates = tokenManager.getTrackedDates();
      
      expect(dates).toEqual(["2024-01-15", "2024-01-16", "2024-01-17"]);
    });

    it("should return empty array when no dates tracked", () => {
      expect(tokenManager.getTrackedDates()).toEqual([]);
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle typical daily usage pattern", () => {
      // Morning: 3 summaries
      tokenManager.trackUsage(500, 200);
      tokenManager.trackUsage(600, 250);
      tokenManager.trackUsage(450, 180);
      
      // Afternoon: 2 quizzes
      tokenManager.trackUsage(800, 400);
      tokenManager.trackUsage(750, 380);
      
      const usage = tokenManager.getDailyUsage();
      
      expect(usage.requestCount).toBe(5);
      expect(usage.inputTokens).toBe(3100);
      expect(usage.outputTokens).toBe(1410);
      expect(usage.totalTokens).toBe(4510);
      
      const status = tokenManager.getBudgetStatus();
      expect(status.warningExceeded).toBe(false);
      expect(status.limitExceeded).toBe(false);
    });

    it("should prevent requests when budget exhausted", () => {
      // Use up most of the budget
      tokenManager.trackUsage(4500, 4500);
      
      // Try to make another request
      const text = "a".repeat(4000); // ~1000 tokens + 500 output = 1500 total
      
      expect(() => {
        tokenManager.validateRequest(text, "summary");
      }).toThrow(APIError);
    });

    it("should track usage across multiple days independently", () => {
      tokenManager.trackUsage(1000, 500, "2024-01-15");
      tokenManager.trackUsage(2000, 1000, "2024-01-15");
      tokenManager.trackUsage(1500, 750, "2024-01-16");
      
      const usage15 = tokenManager.getDailyUsage("2024-01-15");
      const usage16 = tokenManager.getDailyUsage("2024-01-16");
      
      expect(usage15.totalTokens).toBe(4500);
      expect(usage16.totalTokens).toBe(2250);
      
      // Each day should be independent for budget
      const status15 = tokenManager.getBudgetStatus("2024-01-15");
      const status16 = tokenManager.getBudgetStatus("2024-01-16");
      
      expect(status15.warningExceeded).toBe(false);
      expect(status16.warningExceeded).toBe(false);
    });

    it("should handle configuration updates mid-day", () => {
      tokenManager.trackUsage(1000, 500);
      
      // Update budget
      tokenManager.updateConfig({ dailyBudget: 2000 });
      
      const status = tokenManager.getBudgetStatus();
      
      expect(status.budget).toBe(2000);
      expect(status.percentageUsed).toBe(0.75);
      expect(status.warningExceeded).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero token usage", () => {
      tokenManager.trackUsage(0, 0);
      
      const usage = tokenManager.getDailyUsage();
      expect(usage.totalTokens).toBe(0);
      expect(usage.requestCount).toBe(1);
    });

    it("should handle very large token counts", () => {
      tokenManager.trackUsage(1000000, 500000);
      
      const usage = tokenManager.getDailyUsage();
      expect(usage.totalTokens).toBe(1500000);
    });

    it("should handle exact budget limit", () => {
      tokenManager.trackUsage(5000, 5000); // Exactly 10000
      
      const status = tokenManager.getBudgetStatus();
      expect(status.percentageUsed).toBe(1.0);
      expect(status.limitExceeded).toBe(false);
      expect(status.remaining).toBe(0);
    });

    it("should handle exact warning threshold", () => {
      tokenManager.trackUsage(4000, 4000); // Exactly 80%
      
      const status = tokenManager.getBudgetStatus();
      expect(status.percentageUsed).toBe(0.8);
      expect(status.warningExceeded).toBe(true);
    });
  });
});
