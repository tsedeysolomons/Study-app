import crypto from "crypto";

/**
 * Cache Entry with TTL and metadata
 */
export interface CacheEntry<T = any> {
  key: string;
  value: T;
  expiresAt: number; // timestamp
  createdAt: number;
  hitCount: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  hits: number;
  misses: number;
  hitRate: number;
}

/**
 * Cache Manager Configuration
 */
export interface CacheConfig {
  ttl: number; // seconds
  maxEntries: number;
}

/**
 * In-memory cache manager with LRU eviction
 * Supports TTL expiration and hit tracking
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
 */
export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private accessOrder: string[] = [];
  private stats = {
    hits: 0,
    misses: 0,
  };

  constructor(private config: CacheConfig) {}

  /**
   * Generate cache key using SHA-256 hash
   * Ensures consistent key generation for complex inputs
   */
  private generateKey(input: string): string {
    return crypto.createHash("sha256").update(input).digest("hex");
  }

  /**
   * Check if entry has expired
   */
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.expiresAt;
  }

  /**
   * Update LRU access order
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;
    const lruKey = this.accessOrder.shift();
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
          this.accessOrder.splice(index, 1);
        }
      }
    }
  }

  /**
   * Get value from cache
   * Returns null if not found or expired
   * **Validates: 7.1, 7.2, 7.5**
   */
  get<T = any>(input: string): T | null {
    const key = this.generateKey(input);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      this.stats.misses++;
      return null;
    }

    entry.hitCount++;
    this.stats.hits++;
    this.updateAccessOrder(key);
    return entry.value as T;
  }

  /**
   * Set value in cache with TTL
   * **Validates: 7.1, 7.2, 7.3, 7.4, 7.6**
   */
  set<T = any>(input: string, value: T, ttlOverride?: number): void {
    const key = this.generateKey(input);
    const now = Date.now();
    const ttl = ttlOverride || this.config.ttl;
    const expiresAt = now + ttl * 1000;

    // Remove old entry if exists
    if (this.cache.has(key)) {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }

    // Check if we need to evict
    if (this.cache.size >= this.config.maxEntries && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry = {
      key,
      value,
      expiresAt,
      createdAt: now,
      hitCount: 0,
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  /**
   * Check if key exists and is not expired
   */
  has(input: string): boolean {
    const key = this.generateKey(input);
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      return false;
    }
    return true;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Delete specific cache entry
   */
  delete(input: string): boolean {
    const key = this.generateKey(input);
    const deleted = this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    return deleted;
  }

  /**
   * Get cache statistics
   * **Validates: 7.7**
   */
  getStats(): CacheStats {
    this.cleanupExpired();
    const total = this.stats.hits + this.stats.misses;
    return {
      totalEntries: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get all cache entries (for debugging)
   */
  getEntries(): CacheEntry[] {
    return Array.from(this.cache.values());
  }
}

// Global cache instance
let cacheInstance: CacheManager | null = null;

/**
 * Get or create global cache manager instance
 */
export function getCacheManager(config?: CacheConfig): CacheManager {
  if (!cacheInstance) {
    cacheInstance = new CacheManager(
      config || {
        ttl: 86400, // 24 hours
        maxEntries: 1000,
      },
    );
  }
  return cacheInstance;
}

/**
 * Reset cache instance (for testing)
 */
export function resetCacheInstance(): void {
  cacheInstance = null;
}
