/**
 * Tests for in-memory rate limiter
 */

import { InMemoryRateLimiter } from '../rate-limiter';

describe('InMemoryRateLimiter', () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    limiter = new InMemoryRateLimiter({
      maxRequests: 5,
      windowMs: 1000, // 1 second
    });
  });

  afterEach(() => {
    limiter.stop();
    limiter.clear();
  });

  describe('basic functionality', () => {
    it('allows requests within limit', () => {
      const identifier = 'test-ip';

      for (let i = 0; i < 5; i++) {
        expect(limiter.check(identifier)).toBe(true);
      }
    });

    it('blocks requests exceeding limit', () => {
      const identifier = 'test-ip';

      // Make 5 requests (at limit)
      for (let i = 0; i < 5; i++) {
        expect(limiter.check(identifier)).toBe(true);
      }

      // 6th request should be blocked
      expect(limiter.check(identifier)).toBe(false);
    });

    it('tracks different identifiers separately', () => {
      expect(limiter.check('ip1')).toBe(true);
      expect(limiter.check('ip2')).toBe(true);
      expect(limiter.check('ip1')).toBe(true);
      expect(limiter.check('ip2')).toBe(true);

      // Both should still be under limit
      expect(limiter.check('ip1')).toBe(true);
      expect(limiter.check('ip2')).toBe(true);
    });
  });

  describe('sliding window', () => {
    it('allows requests after window expires', async () => {
      const identifier = 'test-ip';

      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        expect(limiter.check(identifier)).toBe(true);
      }
      expect(limiter.check(identifier)).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should allow requests again
      expect(limiter.check(identifier)).toBe(true);
    });

    it('maintains sliding window correctly', async () => {
      const identifier = 'test-ip';

      // Make 3 requests
      limiter.check(identifier);
      limiter.check(identifier);
      limiter.check(identifier);

      // Wait 600ms (half window)
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Make 2 more requests (total 5, at limit)
      limiter.check(identifier);
      limiter.check(identifier);
      expect(limiter.check(identifier)).toBe(false);

      // Wait 500ms more (total 1100ms, first 3 should expire)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Should allow 3 more (the 2 recent ones + 3 new = 5)
      expect(limiter.check(identifier)).toBe(true);
      expect(limiter.check(identifier)).toBe(true);
      expect(limiter.check(identifier)).toBe(true);
      expect(limiter.check(identifier)).toBe(false);
    });
  });

  describe('getRemaining', () => {
    it('returns correct remaining count', () => {
      const identifier = 'test-ip';

      expect(limiter.getRemaining(identifier)).toBe(5);

      limiter.check(identifier);
      expect(limiter.getRemaining(identifier)).toBe(4);

      limiter.check(identifier);
      limiter.check(identifier);
      expect(limiter.getRemaining(identifier)).toBe(2);
    });

    it('returns 0 when limit exceeded', () => {
      const identifier = 'test-ip';

      for (let i = 0; i < 5; i++) {
        limiter.check(identifier);
      }

      expect(limiter.getRemaining(identifier)).toBe(0);
    });
  });

  describe('reset', () => {
    it('resets rate limit for identifier', () => {
      const identifier = 'test-ip';

      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        limiter.check(identifier);
      }
      expect(limiter.check(identifier)).toBe(false);

      // Reset
      limiter.reset(identifier);

      // Should allow requests again
      expect(limiter.check(identifier)).toBe(true);
    });

    it('only resets specified identifier', () => {
      limiter.check('ip1');
      limiter.check('ip1');
      limiter.check('ip2');
      limiter.check('ip2');

      limiter.reset('ip1');

      // ip1 should be reset
      expect(limiter.getRemaining('ip1')).toBe(5);

      // ip2 should still have 3 remaining
      expect(limiter.getRemaining('ip2')).toBe(3);
    });
  });

  describe('clear', () => {
    it('clears all rate limit data', () => {
      limiter.check('ip1');
      limiter.check('ip2');
      limiter.check('ip3');

      limiter.clear();

      expect(limiter.getRemaining('ip1')).toBe(5);
      expect(limiter.getRemaining('ip2')).toBe(5);
      expect(limiter.getRemaining('ip3')).toBe(5);
    });
  });

  describe('cleanup', () => {
    it('cleans up expired entries', async () => {
      limiter.check('ip1');
      limiter.check('ip2');

      // Wait for entries to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Manually trigger cleanup (normally done by timer)
      (limiter as any).cleanup();

      // Entries should be cleaned up
      expect(limiter.getRemaining('ip1')).toBe(5);
      expect(limiter.getRemaining('ip2')).toBe(5);
    });
  });

  describe('default configuration', () => {
    it('uses default config when none provided', () => {
      const defaultLimiter = new InMemoryRateLimiter();
      
      const identifier = 'test';
      for (let i = 0; i < 10; i++) {
        expect(defaultLimiter.check(identifier)).toBe(true);
      }
      expect(defaultLimiter.check(identifier)).toBe(false);

      defaultLimiter.stop();
      defaultLimiter.clear();
    });
  });
});

