/**
 * Rate Limiter
 * 
 * Implements sliding window rate limiting per user/IP.
 * Requirements: 6.1, 6.2, 6.6, 6.7
 */

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerHour: number;
  windowSize: number; // milliseconds
}

export interface RateLimitInfo {
  identifier: string;
  requestCount: number;
  windowStart: number;
  windowEnd: number;
  requests: number[]; // timestamps
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number; // seconds
}

export class RateLimiter {
  private limits: Map<string, RateLimitInfo>;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.limits = new Map();
    
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Check if request is allowed for identifier
   */
  async checkLimit(identifier: string): Promise<RateLimitResult> {
    if (!this.config.enabled) {
      return {
        allowed: true,
        remaining: this.config.requestsPerHour,
        resetAt: Date.now() + this.config.windowSize
      };
    }

    const now = Date.now();
    let info = this.limits.get(identifier);

    // Initialize if not exists
    if (!info) {
      info = {
        identifier,
        requestCount: 0,
        windowStart: now,
        windowEnd: now + this.config.windowSize,
        requests: []
      };
      this.limits.set(identifier, info);
    }

    // Clean up old requests outside the sliding window
    const windowStart = now - this.config.windowSize;
    info.requests = info.requests.filter(timestamp => timestamp > windowStart);
    info.requestCount = info.requests.length;

    // Check if limit exceeded
    if (info.requestCount >= this.config.requestsPerHour) {
      const oldestRequest = info.requests[0];
      const resetAt = oldestRequest + this.config.windowSize;
      const retryAfter = Math.ceil((resetAt - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter
      };
    }

    // Allow request
    info.requests.push(now);
    info.requestCount++;
    info.windowEnd = now + this.config.windowSize;

    return {
      allowed: true,
      remaining: this.config.requestsPerHour - info.requestCount,
      resetAt: info.windowEnd
    };
  }

  /**
   * Record a request for identifier
   */
  async recordRequest(identifier: string): Promise<void> {
    const result = await this.checkLimit(identifier);
    if (!result.allowed) {
      throw new Error('Rate limit exceeded');
    }
  }

  /**
   * Get current limit info for identifier
   */
  async getLimitInfo(identifier: string): Promise<RateLimitInfo | null> {
    return this.limits.get(identifier) || null;
  }

  /**
   * Reset limit for identifier
   */
  async resetLimit(identifier: string): Promise<void> {
    this.limits.delete(identifier);
  }

  /**
   * Get remaining requests for identifier
   */
  async getRemaining(identifier: string): Promise<number> {
    const result = await this.checkLimit(identifier);
    return result.remaining;
  }

  /**
   * Check if identifier is currently limited
   */
  async isLimited(identifier: string): Promise<boolean> {
    const result = await this.checkLimit(identifier);
    return !result.allowed;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    
    for (const [identifier, info] of this.limits.entries()) {
      // Remove if window has expired and no recent requests
      if (info.windowEnd < now && info.requests.length === 0) {
        this.limits.delete(identifier);
      }
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    // Clean up every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalIdentifiers: this.limits.size,
      enabled: this.config.enabled,
      requestsPerHour: this.config.requestsPerHour,
      windowSize: this.config.windowSize
    };
  }

  /**
   * Clear all limits
   */
  async clear(): Promise<void> {
    this.limits.clear();
  }
}
