/**
 * Tests for /api/tools/confirm route (HITL confirmed execution)
 */

import { POST } from '../route';
import { createMockRequest, expectResponse } from '@/app/__tests__/helpers/test-utils';

// Mock the rate limiter used by the confirm route
jest.mock('@/lib/rate-limiter', () => {
  const actual = jest.requireActual('@/lib/rate-limiter');
  return {
    ...actual,
    createRateLimiter: jest.fn(() => ({
      check: jest.fn(() => true),
      getRemaining: jest.fn(() => 5),
      reset: jest.fn(),
      clear: jest.fn(),
    })),
  };
});

// Mock audit logger to prevent console output
jest.mock('@/lib/audit', () => {
  const actual = jest.requireActual('@/lib/audit');
  return {
    ...actual,
    auditLogger: { log: jest.fn() },
  };
});

describe('/api/tools/confirm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes sendEmail successfully (200)', async () => {
    const req = createMockRequest({
      tool: 'sendEmail',
      input: { to: 'alice@example.com', subject: 'Hi', body: 'Hello' },
    });

    const response = await POST(req);
    const data = await expectResponse(response, 200);

    expect(data.result).toHaveProperty('to', 'alice@example.com');
    expect(data.result).toHaveProperty('subject', 'Hi');
    expect(data.result).toHaveProperty('body', 'Hello');
    expect(data.result).toHaveProperty('status', 'sent');
  });

  it('returns 400 for non-confirm tool (weather)', async () => {
    const req = createMockRequest({
      tool: 'weather',
      input: { city: 'London' },
    });

    const response = await POST(req);
    const data = await expectResponse(response, 400);
    expect(data.error).toBe('This tool does not require confirmation. Use /api/tools/execute.');
  });

  it('returns 400 for missing tool name', async () => {
    const req = createMockRequest({
      input: { to: 'alice@example.com' },
    });

    const response = await POST(req);
    const data = await expectResponse(response, 400);
    expect(data.error).toBe('Missing tool name');
  });

  it('returns 400 for missing input', async () => {
    const req = createMockRequest({
      tool: 'sendEmail',
    });

    const response = await POST(req);
    const data = await expectResponse(response, 400);
    expect(data.error).toBe('Missing input');
  });

  it('returns 404 for unknown tool', async () => {
    const req = createMockRequest({
      tool: 'nonexistent',
      input: { x: 1 },
    });

    const response = await POST(req);
    const data = await expectResponse(response, 404);
    expect(data.error).toBe('Tool not found');
  });

  it('returns 429 on rate limit', async () => {
    // Override the mock to return false for rate limiting
    const { createRateLimiter } = require('@/lib/rate-limiter');
    createRateLimiter.mockReturnValue({
      check: jest.fn(() => false),
      getRemaining: jest.fn(() => 0),
      reset: jest.fn(),
      clear: jest.fn(),
    });

    // Re-import to pick up the new mock
    jest.resetModules();
    jest.mock('@/lib/rate-limiter', () => {
      const actual = jest.requireActual('@/lib/rate-limiter');
      return {
        ...actual,
        createRateLimiter: jest.fn(() => ({
          check: jest.fn(() => false),
          getRemaining: jest.fn(() => 0),
          reset: jest.fn(),
          clear: jest.fn(),
        })),
      };
    });
    jest.mock('@/lib/audit', () => {
      const actual = jest.requireActual('@/lib/audit');
      return {
        ...actual,
        auditLogger: { log: jest.fn() },
      };
    });

    const { POST: POST2 } = require('../route');
    const req = createMockRequest({
      tool: 'sendEmail',
      input: { to: 'alice@example.com', subject: 'Hi', body: 'Hello' },
    });

    const response = await POST2(req);
    const data = await expectResponse(response, 429);
    expect(data.error).toBe('Rate limit exceeded');
  });

  it('returns 400 on Zod validation failure', async () => {
    const req = createMockRequest({
      tool: 'sendEmail',
      input: { to: 123, subject: 'Hi', body: 'Hello' }, // to should be string
    });

    const response = await POST(req);
    await expectResponse(response, 400);
  });
});
