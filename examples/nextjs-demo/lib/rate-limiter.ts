/**
 * Pluggable rate limiting system for Better UI
 * Supports multiple backends: in-memory, Redis, custom implementations
 */

declare const process: {
  env: Record<string, string | undefined>;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
declare function require(id: string): unknown;

/** Minimal Redis client interface for rate limiting operations */
interface RedisClient {
  pipeline(): RedisPipeline;
  del(...keys: string[]): Promise<number>;
  keys(pattern: string): Promise<string[]>;
}

interface RedisPipeline {
  zremrangebyscore(key: string, min: number, max: number): RedisPipeline;
  zadd(key: string, score: number, member: string): RedisPipeline;
  zcard(key: string): RedisPipeline;
  expire(key: string, seconds: number): RedisPipeline;
  exec(): Promise<Array<[Error | null, unknown]> | null>;
}


export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Cleanup interval in milliseconds (default: 5x window) */
  cleanupIntervalMs?: number;
  /** If true, allow requests when Redis is unavailable. Default: false (secure) */
  failOpen?: boolean;
}

/**
 * Rate limiter interface that all implementations must follow
 * Supports both sync and async implementations
 */
export interface RateLimiter {
  /**
   * Check if a request should be allowed
   * @param identifier - Unique identifier (e.g., IP address, user ID)
   * @returns true if allowed, false if rate limited
   */
  check(identifier: string): boolean | Promise<boolean>;

  /**
   * Get remaining requests for an identifier
   */
  getRemaining(identifier: string): number | Promise<number>;

  /**
   * Reset rate limit for an identifier
   */
  reset(identifier: string): void | Promise<void>;

  /**
   * Clear all rate limit data
   */
  clear(): void | Promise<void>;
}

/**
 * In-memory rate limiter using sliding window algorithm
 * Perfect for development, single-instance deployments, or testing
 */
interface RateLimitEntry {
  timestamps: number[];
  lastCleanup: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 10 * 1000, // 10 seconds
  cleanupIntervalMs: 50 * 1000, // 50 seconds
};

export class InMemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private config: RateLimitConfig;
  private cleanupTimer?: ReturnType<typeof setInterval> & { unref?: () => void };

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

/**
 * Redis-based rate limiter for production deployments
 * Uses Redis INCR and EXPIRE for atomic distributed rate limiting
 */
export class RedisRateLimiter implements RateLimiter {
  private config: RateLimitConfig;
  private redis: RedisClient;

  constructor(redis: RedisClient, config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.redis = redis;
  }

  async check(identifier: string): Promise<boolean> {
    const key = `rate-limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();
      
      // Remove old entries
      pipeline.zremrangebyscore(key, 0, windowStart);
      
      // Count current requests
      pipeline.zcard(key);
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiration
      pipeline.expire(key, Math.ceil(this.config.windowMs / 1000));
      
      const results = await pipeline.exec();
      const currentCount = Number(results?.[1]?.[1]) || 0;

      return currentCount < this.config.maxRequests;
    } catch (error) {
      console.error('Redis rate limiter error:', error);
      return this.config.failOpen ?? false;
    }
  }

  async getRemaining(identifier: string): Promise<number> {
    const key = `rate-limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    try {
      const pipeline = this.redis.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zcard(key);

      const results = await pipeline.exec();
      const currentCount = Number(results?.[1]?.[1]) || 0;

      return Math.max(0, this.config.maxRequests - currentCount);
    } catch (error) {
      console.error('Redis rate limiter error:', error);
      return this.config.failOpen ? this.config.maxRequests : 0;
    }
  }

  async reset(identifier: string): Promise<void> {
    const key = `rate-limit:${identifier}`;
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Redis rate limiter error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      // Delete all rate limit keys
      const keys = await this.redis.keys('rate-limit:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Redis rate limiter error:', error);
    }
  }
}

/**
 * Factory function to create appropriate rate limiter based on environment
 */
export function createRateLimiter(config?: Partial<RateLimitConfig>): RateLimiter {
  // Check if Redis URL is configured
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    try {
      // Try to import Redis client dynamically
      const Redis = (require('ioredis') || require('redis')) as new (url: string) => RedisClient;
      const redis = new Redis(redisUrl);
      console.log('Using Redis rate limiter for production');
      return new RedisRateLimiter(redis, config);
    } catch (error) {
      console.warn('Redis not available, falling back to in-memory rate limiter:', error);
    }
  }
  
  console.log('Using in-memory rate limiter');
  return new InMemoryRateLimiter(config);
}

// Singleton instance for the API route
export const rateLimiter = createRateLimiter({
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '10000', 10),
});
