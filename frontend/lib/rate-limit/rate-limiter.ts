/**
 * Rate Limit Bucket for tracking requests per time window
 */
export interface RateLimitBucket {
  identifier: string; // user ID or IP address
  requestCount: number;
  windowStart: number; // timestamp
  resetAt: number; // timestamp
}

/**
 * Rate Limiter Configuration
 */
export interface RateLimiterConfig {
  requestsPerHour: number;
  windowDuration: number; // milliseconds (default 3600000 = 1 hour)
}

/**
 * Rate Limit Result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number; // seconds
}

/**
 * In-memory rate limiter with sliding window algorithm
 * Tracks per-user or per-IP request quotas
 * **Validates: Requirements 6.1, 6.2, 6.6, 6.7**
 */
export class RateLimiter {
  private buckets: Map<string, RateLimitBucket> = new Map();

  constructor(private config: RateLimiterConfig) {}

  /**
   * Check if request is allowed under rate limit
   * Uses sliding window algorithm
   * **Validates: 6.1, 6.2, 15.8**
   */
  checkLimit(identifier: string): RateLimitResult {
    const now = Date.now();
    let bucket = this.buckets.get(identifier);

    // Create new bucket if doesn't exist
    if (!bucket) {
      bucket = {
        identifier,
        requestCount: 1,
        windowStart: now,
        resetAt: now + this.config.windowDuration,
      };
      this.buckets.set(identifier, bucket);
      return {
        allowed: true,
        remaining: this.config.requestsPerHour - 1,
        resetAt: bucket.resetAt,
      };
    }

    // Reset bucket if window has expired
    if (now >= bucket.resetAt) {
      bucket.requestCount = 1;
      bucket.windowStart = now;
      bucket.resetAt = now + this.config.windowDuration;
      this.buckets.set(identifier, bucket);
      return {
        allowed: true,
        remaining: this.config.requestsPerHour - 1,
        resetAt: bucket.resetAt,
      };
    }

    // Check if limit exceeded
    if (bucket.requestCount >= this.config.requestsPerHour) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        resetAt: bucket.resetAt,
        retryAfter,
      };
    }

    // Increment counter
    bucket.requestCount++;
    const remaining = this.config.requestsPerHour - bucket.requestCount;

    return {
      allowed: true,
      remaining,
      resetAt: bucket.resetAt,
    };
  }

  /**
   * Get current quota status without incrementing counter
   */
  getStatus(identifier: string): RateLimitResult {
    const now = Date.now();
    const bucket = this.buckets.get(identifier);

    if (!bucket || now >= bucket.resetAt) {
      return {
        allowed: true,
        remaining: this.config.requestsPerHour,
        resetAt: now + this.config.windowDuration,
      };
    }

    const remaining = Math.max(
      0,
      this.config.requestsPerHour - bucket.requestCount,
    );

    return {
      allowed: remaining > 0,
      remaining,
      resetAt: bucket.resetAt,
    };
  }

  /**
   * Reset quota for specific identifier
   */
  reset(identifier: string): void {
    this.buckets.delete(identifier);
  }

  /**
   * Clear all rate limit data
   */
  clear(): void {
    this.buckets.clear();
  }

  /**
   * Get all active buckets (for monitoring/debugging)
   */
  getBuckets(): RateLimitBucket[] {
    return Array.from(this.buckets.values());
  }

  /**
   * Clean up expired buckets
   * **Validates: 6.7**
   */
  cleanup(): void {
    const now = Date.now();
    for (const [identifier, bucket] of this.buckets.entries()) {
      if (now >= bucket.resetAt) {
        this.buckets.delete(identifier);
      }
    }
  }

  /**
   * Get metrics for all tracked identifiers
   */
  getMetrics(): {
    totalIdentifiers: number;
    activeBuckets: number;
    averageRequestsPerBucket: number;
  } {
    this.cleanup();
    const buckets = this.buckets.size;
    const totalRequests = Array.from(this.buckets.values()).reduce(
      (sum, b) => sum + b.requestCount,
      0,
    );

    return {
      totalIdentifiers: buckets,
      activeBuckets: buckets,
      averageRequestsPerBucket: buckets > 0 ? totalRequests / buckets : 0,
    };
  }
}

// Global rate limiter instance
let rateLimiterInstance: RateLimiter | null = null;

/**
 * Get or create global rate limiter instance
 */
export function getRateLimiter(config?: RateLimiterConfig): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter(
      config || {
        requestsPerHour: 20,
        windowDuration: 3600000, // 1 hour
      },
    );
  }
  return rateLimiterInstance;
}

/**
 * Reset rate limiter instance (for testing)
 */
export function resetRateLimiterInstance(): void {
  rateLimiterInstance = null;
}
