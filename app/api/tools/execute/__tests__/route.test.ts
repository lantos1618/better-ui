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
  });
});

