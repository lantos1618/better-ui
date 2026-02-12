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

  describe('concurrent access', () => {
    it('handles concurrent checks from same identifier', async () => {
      const concurrentLimiter = new InMemoryRateLimiter({
        maxRequests: 10,
        windowMs: 10000,
      });

      const identifier = 'concurrent-ip';

      // Simulate 20 concurrent requests
      const promises = Array(20)
        .fill(null)
        .map(() => Promise.resolve(concurrentLimiter.check(identifier)));

      const results = await Promise.all(promises);

      // First 10 should pass, rest should fail
      const passCount = results.filter((r) => r === true).length;
      const failCount = results.filter((r) => r === false).length;

      expect(passCount).toBe(10);
      expect(failCount).toBe(10);

      concurrentLimiter.stop();
      concurrentLimiter.clear();
    });

    it('handles concurrent checks from different identifiers', async () => {
      const concurrentLimiter = new InMemoryRateLimiter({
        maxRequests: 5,
        windowMs: 10000,
      });

      const identifiers = ['ip1', 'ip2', 'ip3', 'ip4', 'ip5'];

      // Each identifier makes 5 requests concurrently
      const promises = identifiers.flatMap((id) =>
        Array(5)
          .fill(null)
          .map(() => Promise.resolve(concurrentLimiter.check(id)))
      );

      const results = await Promise.all(promises);

      // All should pass (5 requests * 5 identifiers, each at limit)
      expect(results.every((r) => r === true)).toBe(true);

      concurrentLimiter.stop();
      concurrentLimiter.clear();
    });
  });

  describe('boundary conditions', () => {
    it('handles exactly at limit', () => {
      const identifier = 'boundary';

      // Make exactly 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        const result = limiter.check(identifier);
        expect(result).toBe(true);
      }

      // The 6th should fail
      expect(limiter.check(identifier)).toBe(false);
    });

    it('handles zero remaining correctly', () => {
      const identifier = 'zero';

      // Exhaust limit
      for (let i = 0; i < 5; i++) {
        limiter.check(identifier);
      }

      expect(limiter.getRemaining(identifier)).toBe(0);

      // Additional checks should still return 0, not negative
      limiter.check(identifier);
      limiter.check(identifier);
      expect(limiter.getRemaining(identifier)).toBe(0);
    });

    it('handles new identifier correctly', () => {
      const newId = 'brand-new-' + Date.now();

      // New identifier should have full allowance
      expect(limiter.getRemaining(newId)).toBe(5);

      // First check should pass
      expect(limiter.check(newId)).toBe(true);

      // Should now have 4 remaining
      expect(limiter.getRemaining(newId)).toBe(4);
    });
  });

  describe('stress testing', () => {
    it('handles many unique identifiers', () => {
      const stressLimiter = new InMemoryRateLimiter({
        maxRequests: 5,
        windowMs: 10000,
      });

      const uniqueIds = 1000;

      for (let i = 0; i < uniqueIds; i++) {
        const id = `stress-id-${i}`;
        expect(stressLimiter.check(id)).toBe(true);
      }

      // Verify each still has 4 remaining
      for (let i = 0; i < 100; i++) {
        // Spot check 100 random ones
        const id = `stress-id-${i}`;
        expect(stressLimiter.getRemaining(id)).toBe(4);
      }

      stressLimiter.stop();
      stressLimiter.clear();
    });

    it('handles rapid successive checks', () => {
      const rapidLimiter = new InMemoryRateLimiter({
        maxRequests: 100,
        windowMs: 10000,
      });

      const identifier = 'rapid';

      // Rapid fire 150 checks
      const results = [];
      for (let i = 0; i < 150; i++) {
        results.push(rapidLimiter.check(identifier));
      }

      const passCount = results.filter((r) => r === true).length;
      const failCount = results.filter((r) => r === false).length;

      expect(passCount).toBe(100);
      expect(failCount).toBe(50);

      rapidLimiter.stop();
      rapidLimiter.clear();
    });
  });

  describe('edge cases', () => {
    it('stop() prevents further cleanup cycles', () => {
      const stoppableLimiter = new InMemoryRateLimiter({
        maxRequests: 5,
        windowMs: 100,
        cleanupIntervalMs: 50,
      });

      stoppableLimiter.check('test');
      stoppableLimiter.stop();

      // After stop, cleanup timer should be cleared
      // This is mainly a coverage test - we just ensure no errors
      expect(() => stoppableLimiter.stop()).not.toThrow();

      stoppableLimiter.clear();
    });

    it('cleanup handles entries with no timestamps', async () => {
      const cleanupLimiter = new InMemoryRateLimiter({
        maxRequests: 5,
        windowMs: 50,
        cleanupIntervalMs: 10000, // Manual cleanup
      });

      cleanupLimiter.check('cleanup-test');

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Manual cleanup
      (cleanupLimiter as any).cleanup();

      // Should not throw and identifier should be fresh
      expect(cleanupLimiter.getRemaining('cleanup-test')).toBe(5);

      cleanupLimiter.stop();
      cleanupLimiter.clear();
    });
  });

  describe('partial configuration', () => {
    it('merges partial config with defaults', () => {
      const partialLimiter = new InMemoryRateLimiter({
        maxRequests: 3,
        // windowMs not specified, should use default
      });

      const id = 'partial';

      // Should use maxRequests: 3
      expect(partialLimiter.check(id)).toBe(true);
      expect(partialLimiter.check(id)).toBe(true);
      expect(partialLimiter.check(id)).toBe(true);
      expect(partialLimiter.check(id)).toBe(false);

      partialLimiter.stop();
      partialLimiter.clear();
    });
  });
});

