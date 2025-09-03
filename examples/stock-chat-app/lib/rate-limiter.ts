interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export class RateLimiter {
  private limit: number;
  private windowMs: number;

  constructor(limit: number = 10, windowMs: number = 60000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const userLimit = store[identifier];

    if (!userLimit || now > userLimit.resetTime) {
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
}