/**
 * High-signal tests for /api/tools/execute route
 */

import { POST } from '../route';
import { rateLimiter } from '@/lib/rate-limiter';
import { createMockRequest, expectResponse } from '@/app/__tests__/helpers/test-utils';

jest.mock('@/lib/rate-limiter', () => {
  const actual = jest.requireActual('@/lib/rate-limiter');
  return {
    ...actual,
    rateLimiter: {
      check: jest.fn(() => true),
    },
  };
});

describe('/api/tools/execute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimiter.check as jest.Mock).mockReturnValue(true);
  });

  describe('happy path', () => {
    it('executes a valid tool with valid input', async () => {
      const req = createMockRequest({
        tool: 'weather',
        input: { city: 'London' },
      });

      const response = await POST(req);
      const data = await expectResponse(response, 200);

      expect(data.result).toHaveProperty('city', 'London');
      expect(data.result).toHaveProperty('temp');
    });
  });

  describe('validation and errors', () => {
    it('returns 400 when tool name is missing', async () => {
      const req = createMockRequest({ input: { city: 'London' } });
      const response = await POST(req);
      const data = await expectResponse(response, 400);
      expect(data).toHaveProperty('error', 'Missing tool name');
    });

    it('returns 400 when input is missing', async () => {
      const req = createMockRequest({ tool: 'weather' });
      const response = await POST(req);
      const data = await expectResponse(response, 400);
      expect(data).toHaveProperty('error', 'Missing input');
    });

    it('returns 404 when tool does not exist', async () => {
      const req = createMockRequest({ tool: 'nope', input: { city: 'x' } });
      const response = await POST(req);
      const data = await expectResponse(response, 404);
      expect(data).toHaveProperty('error', 'Tool not found');
    });

    it('returns 400 on Zod validation failure', async () => {
      const req = createMockRequest({ tool: 'weather', input: { city: 123 } });
      const response = await POST(req);
      await expectResponse(response, 400);
    });
  });

  describe('rate limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {
      (rateLimiter.check as jest.Mock).mockReturnValue(false);
      const req = createMockRequest({ tool: 'weather', input: { city: 'London' } });
      const response = await POST(req);
      const data = await expectResponse(response, 429);
      expect(data).toHaveProperty('error', 'Rate limit exceeded');
    });

    it('uses forwarded IP when provided', async () => {
      const checkSpy = rateLimiter.check as jest.Mock;
      const req = createMockRequest(
        { tool: 'weather', input: { city: 'London' } },
        { 'x-forwarded-for': '192.0.2.1, 10.0.0.1' }
      );
      await POST(req);
      expect(checkSpy).toHaveBeenCalledWith('192.0.2.1');
    });

    it('uses x-real-ip as fallback', async () => {
      const checkSpy = rateLimiter.check as jest.Mock;
      const req = createMockRequest(
        { tool: 'weather', input: { city: 'London' } },
        { 'x-real-ip': '203.0.113.50' }
      );
      await POST(req);
      expect(checkSpy).toHaveBeenCalledWith('203.0.113.50');
    });

    it('uses anonymous when no IP headers present', async () => {
      const checkSpy = rateLimiter.check as jest.Mock;
      const req = createMockRequest(
        { tool: 'weather', input: { city: 'London' } },
        {} // No IP headers
      );
      await POST(req);
      expect(checkSpy).toHaveBeenCalledWith('anonymous');
    });

    it('prefers x-forwarded-for over x-real-ip', async () => {
      const checkSpy = rateLimiter.check as jest.Mock;
      const req = createMockRequest(
        { tool: 'weather', input: { city: 'London' } },
        {
          'x-forwarded-for': '198.51.100.1',
          'x-real-ip': '203.0.113.50',
        }
      );
      await POST(req);
      expect(checkSpy).toHaveBeenCalledWith('198.51.100.1');
    });
  });

  describe('edge cases', () => {
    it('handles empty body gracefully', async () => {
      const req = {
        json: async () => ({}),
        headers: new Headers(),
        method: 'POST',
        url: 'http://localhost:3000/api/tools/execute',
      } as Request;

      const response = await POST(req);
      const data = await expectResponse(response, 400);
      expect(data).toHaveProperty('error', 'Missing tool name');
    });

    it('handles null input', async () => {
      const req = createMockRequest({ tool: 'weather', input: null });
      const response = await POST(req);
      // null is a valid value, just not valid for the weather tool schema
      const data = await expectResponse(response, 400);
      expect(data).toHaveProperty('error');
    });

    it('handles undefined input', async () => {
      const req = createMockRequest({ tool: 'weather' });
      const response = await POST(req);
      const data = await expectResponse(response, 400);
      expect(data).toHaveProperty('error', 'Missing input');
    });

    it('handles complex nested input', async () => {
      const req = createMockRequest({
        tool: 'weather',
        input: { city: 'London', extra: { nested: { deep: true } } },
      });
      // Zod strips unknown keys
      const response = await POST(req);
      const data = await expectResponse(response, 200);
      expect(data.result.city).toBe('London');
    });

    it('handles special characters in input', async () => {
      const req = createMockRequest({
        tool: 'weather',
        input: { city: 'São Paulo' },
      });
      const response = await POST(req);
      const data = await expectResponse(response, 200);
      expect(data.result.city).toBe('São Paulo');
    });

    it('handles unicode in input', async () => {
      const req = createMockRequest({
        tool: 'weather',
        input: { city: '東京' },
      });
      const response = await POST(req);
      const data = await expectResponse(response, 200);
      expect(data.result.city).toBe('東京');
    });

    it('handles emoji in input', async () => {
      const req = createMockRequest({
        tool: 'weather',
        input: { city: 'Paris 🗼' },
      });
      const response = await POST(req);
      const data = await expectResponse(response, 200);
      expect(data.result.city).toBe('Paris 🗼');
    });

    it('handles very long city names', async () => {
      const longCity = 'A'.repeat(1000);
      const req = createMockRequest({
        tool: 'weather',
        input: { city: longCity },
      });
      const response = await POST(req);
      const data = await expectResponse(response, 200);
      expect(data.result.city).toBe(longCity);
    });
  });

  describe('security', () => {
    it('does not expose internal error details', async () => {
      // Create a request that will cause an internal error
      const req = createMockRequest({
        tool: 'weather',
        input: { city: 123 }, // Wrong type
      });

      const response = await POST(req);
      const data = await response.json();

      // Should return error but not stack trace or internal details
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(data.error).not.toContain('at '); // No stack trace
      expect(data).not.toHaveProperty('stack');
    });

    it('does not reveal which tools exist in 404', async () => {
      const req = createMockRequest({
        tool: 'nonexistent',
        input: { test: 'data' },
      });

      const response = await POST(req);
      const data = await expectResponse(response, 404);

      // Generic message, no hints about existing tools
      expect(data.error).toBe('Tool not found');
      expect(JSON.stringify(data)).not.toContain('weather');
      expect(JSON.stringify(data)).not.toContain('search');
      expect(JSON.stringify(data)).not.toContain('counter');
    });
  });
});

