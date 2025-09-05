interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 5 * 60 * 1000);

export class RateLimiter {
  private limit: number;
  private windowMs: number;
  private burstLimit: number;
  private burstWindowMs: number;

  constructor(limit: number = 10, windowMs: number = 60000, burstLimit: number = 5, burstWindowMs: number = 10000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.burstLimit = burstLimit;
    this.burstWindowMs = burstWindowMs;
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    
    // Clean up expired entries for this identifier
    if (store[identifier] && now > store[identifier].resetTime) {
      delete store[identifier];
    }
    
    const userLimit = store[identifier];

    if (!userLimit) {
      store[identifier] = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      return {
        allowed: true,
        remaining: this.limit - 1,
        resetTime: now + this.windowMs,
      };
    }

    if (userLimit.count >= this.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: userLimit.resetTime,
      };
    }

    userLimit.count++;
    return {
      allowed: true,
      remaining: this.limit - userLimit.count,
      resetTime: userLimit.resetTime,
    };
  }

  reset(identifier: string): void {
    delete store[identifier];
  }
  
  // Get current store size for monitoring
  getStoreSize(): number {
    return Object.keys(store).length;
  }
}