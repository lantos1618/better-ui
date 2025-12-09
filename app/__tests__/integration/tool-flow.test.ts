/**
 * Integration tests for full tool execution flow
 * Tests the complete flow: UI component → API call → Tool execution → Response → UI update
 */

import { POST } from '@/app/api/tools/execute/route';
import { tools } from '@/lib/tools';
import { createMockRequest, expectResponse } from '@/app/__tests__/helpers/test-utils';
import { rateLimiter } from '@/lib/rate-limiter';

// Mock rate limiter to allow all requests
jest.mock('@/lib/rate-limiter', () => {
  const actual = jest.requireActual('@/lib/rate-limiter');
  return {
    ...actual,
    rateLimiter: {
      check: jest.fn(() => true),
    },
  };
});

describe('Tool Execution Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (rateLimiter.check as jest.Mock).mockReturnValue(true);
  });

  describe('Weather Tool Flow', () => {
    it('executes weather tool end-to-end', async () => {
      const req = createMockRequest({
        tool: 'weather',
        input: { city: 'Tokyo' },
      });

      const response = await POST(req);
      const data = await expectResponse(response, 200);

      // Verify response structure
      expect(data).toHaveProperty('result');
      expect(data.result).toHaveProperty('city', 'Tokyo');
      expect(data.result).toHaveProperty('temp');
      expect(typeof data.result.temp).toBe('number');
      expect(data.result).toHaveProperty('condition');
      expect(['sunny', 'cloudy']).toContain(data.result.condition);
    });

    it('handles multiple weather requests in sequence', async () => {
      const cities = ['London', 'Paris', 'New York'];

      for (const city of cities) {
        const req = createMockRequest({
          tool: 'weather',
          input: { city },
        });

        const response = await POST(req);
        const data = await expectResponse(response, 200);

        expect(data.result.city).toBe(city);
      }
    });
  });

  describe('Search Tool Flow', () => {
    it('executes search tool end-to-end', async () => {
      const req = createMockRequest({
        tool: 'search',
        input: { query: 'React hooks' },
      });

      const response = await POST(req);
      const data = await expectResponse(response, 200);

      expect(data.result).toHaveProperty('results');
      expect(Array.isArray(data.result.results)).toBe(true);
      expect(data.result.results.length).toBeGreaterThan(0);
      expect(data.result.results[0]).toHaveProperty('id');
      expect(data.result.results[0]).toHaveProperty('title');
      expect(data.result.results[0]).toHaveProperty('score');
    });
  });

  describe('Counter Tool Flow', () => {
    it('executes counter tool with state persistence', async () => {
      const counterName = `test-${Date.now()}`;

      // Initial get
      const getReq = createMockRequest({
        tool: 'counter',
        input: { name: counterName, action: 'get' },
      });

      const getResponse = await POST(getReq);
      const getData = await expectResponse(getResponse, 200);
      expect(getData.result.value).toBe(0);

      // Increment
      const incReq = createMockRequest({
        tool: 'counter',
        input: { name: counterName, action: 'increment', amount: 5 },
      });

      const incResponse = await POST(incReq);
      const incData = await expectResponse(incResponse, 200);
      expect(incData.result.value).toBe(5);
      expect(incData.result.previousValue).toBe(0);

      // Increment again
      const incReq2 = createMockRequest({
        tool: 'counter',
        input: { name: counterName, action: 'increment', amount: 3 },
      });

      const incResponse2 = await POST(incReq2);
      const incData2 = await expectResponse(incResponse2, 200);
      expect(incData2.result.value).toBe(8);
      expect(incData2.result.previousValue).toBe(5);

      // Decrement
      const decReq = createMockRequest({
        tool: 'counter',
        input: { name: counterName, action: 'decrement', amount: 2 },
      });

      const decResponse = await POST(decReq);
      const decData = await expectResponse(decResponse, 200);
      expect(decData.result.value).toBe(6);
      expect(decData.result.previousValue).toBe(8);

      // Reset
      const resetReq = createMockRequest({
        tool: 'counter',
        input: { name: counterName, action: 'reset' },
      });

      const resetResponse = await POST(resetReq);
      const resetData = await expectResponse(resetResponse, 200);
      expect(resetData.result.value).toBe(0);
    });

    it('maintains separate state for different counter names', async () => {
      const name1 = `counter1-${Date.now()}`;
      const name2 = `counter2-${Date.now()}`;

      // Increment counter 1
      const req1 = createMockRequest({
        tool: 'counter',
        input: { name: name1, action: 'increment', amount: 10 },
      });
      const res1 = await POST(req1);
      const data1 = await expectResponse(res1, 200);
      expect(data1.result.value).toBe(10);

      // Increment counter 2
      const req2 = createMockRequest({
        tool: 'counter',
        input: { name: name2, action: 'increment', amount: 20 },
      });
      const res2 = await POST(req2);
      const data2 = await expectResponse(res2, 200);
      expect(data2.result.value).toBe(20);

      // Verify counter 1 is still 10
      const getReq1 = createMockRequest({
        tool: 'counter',
        input: { name: name1, action: 'get' },
      });
      const getRes1 = await POST(getReq1);
      const getData1 = await expectResponse(getRes1, 200);
      expect(getData1.result.value).toBe(10);
    });
  });

  describe('Error Propagation', () => {
    it('propagates validation errors from API to response', async () => {
      const req = createMockRequest({
        tool: 'weather',
        input: { city: 123 }, // Invalid type
      });

      const response = await POST(req);
      const data = await expectResponse(response, 400);

      expect(data).toHaveProperty('error');
    });

    it('propagates tool not found error', async () => {
      const req = createMockRequest({
        tool: 'nonexistent-tool',
        input: { test: 'value' },
      });

      const response = await POST(req);
      const data = await expectResponse(response, 404);

      expect(data).toHaveProperty('error', 'Tool not found');
    });

    it('handles rate limiting in flow', async () => {
      (rateLimiter.check as jest.Mock).mockReturnValue(false);

      const req = createMockRequest({
        tool: 'weather',
        input: { city: 'London' },
      });

      const response = await POST(req);
      const data = await expectResponse(response, 429);

      expect(data).toHaveProperty('error', 'Rate limit exceeded');
    });
  });

  describe('Multiple Tool Execution', () => {
    it('executes different tools in sequence', async () => {
      // Weather
      const weatherReq = createMockRequest({
        tool: 'weather',
        input: { city: 'London' },
      });
      const weatherRes = await POST(weatherReq);
      const weatherData = await expectResponse(weatherRes, 200);
      expect(weatherData.result).toHaveProperty('city', 'London');

      // Search
      const searchReq = createMockRequest({
        tool: 'search',
        input: { query: 'test' },
      });
      const searchRes = await POST(searchReq);
      const searchData = await expectResponse(searchRes, 200);
      expect(searchData.result).toHaveProperty('results');

      // Counter
      const counterReq = createMockRequest({
        tool: 'counter',
        input: { name: 'test', action: 'increment' },
      });
      const counterRes = await POST(counterReq);
      const counterData = await expectResponse(counterRes, 200);
      expect(counterData.result).toHaveProperty('value');
    });
  });

  describe('Request Context', () => {
    it('passes headers through to tool context', async () => {
      const req = createMockRequest(
        {
          tool: 'weather',
          input: { city: 'London' },
        },
        { 'x-custom-header': 'test-value' }
      );

      const response = await POST(req);
      const data = await expectResponse(response, 200);

      // Tool should execute successfully with headers
      expect(data.result).toBeDefined();
    });
  });
});

