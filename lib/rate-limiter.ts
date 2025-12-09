/**
 * Simple in-memory rate limiter
 * Uses sliding window algorithm to track requests per identifier
 */

interface RateLimitEntry {
  timestamps: number[];
  lastCleanup: number;
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Cleanup interval in milliseconds (default: 5x window) */
  cleanupIntervalMs?: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 10 * 1000, // 10 seconds
  cleanupIntervalMs: 50 * 1000, // 50 seconds
};

export class InMemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanup();
  }

  /**
   * Check if a request should be allowed
   * @param identifier - Unique identifier (e.g., IP address)
   * @returns true if allowed, false if rate limited
   */
  check(identifier: string): boolean {
    const now = Date.now();
    const entry = this.store.get(identifier) || { timestamps: [], lastCleanup: now };

    // Remove timestamps outside the window
    const cutoff = now - this.config.windowMs;
    entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

    // Check if limit exceeded
    if (entry.timestamps.length >= this.config.maxRequests) {
      return false;
    }

    // Add current timestamp
    entry.timestamps.push(now);
    entry.lastCleanup = now;
    this.store.set(identifier, entry);

    return true;
  }

  /**
   * Get remaining requests for an identifier
   */
  getRemaining(identifier: string): number {
    const now = Date.now();
    const entry = this.store.get(identifier);
    if (!entry) {
      return this.config.maxRequests;
    }

    const cutoff = now - this.config.windowMs;
    const validTimestamps = entry.timestamps.filter((ts) => ts > cutoff);
    return Math.max(0, this.config.maxRequests - validTimestamps.length);
  }

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Clear all rate limit data
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    const interval = this.config.cleanupIntervalMs || this.config.windowMs * 5;
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, interval);
    
    // Unref timer so it doesn't prevent Node.js from exiting
    if (this.cleanupTimer && typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.config.windowMs * 2; // Keep entries for 2x window

    for (const [identifier, entry] of this.store.entries()) {
      // Remove old timestamps
      entry.timestamps = entry.timestamps.filter((ts) => ts > cutoff);

      // Remove entry if no valid timestamps and last cleanup was long ago
      if (entry.timestamps.length === 0 && now - entry.lastCleanup > cutoff) {
        this.store.delete(identifier);
      }
    }
  }

  /**
   * Stop cleanup timer (useful for testing)
   */
  stop(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }
}

// Singleton instance for the API route
export const rateLimiter = new InMemoryRateLimiter({
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '10000', 10),
});

