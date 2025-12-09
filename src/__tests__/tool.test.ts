/**
 * Tests for Better UI Tool functionality
 */

import { z } from 'zod';
import { tool, Tool, ToolContext } from '../tool';

describe('Tool', () => {
  describe('creation', () => {
    it('creates a tool with config object', () => {
      const myTool = tool({
        name: 'test',
        description: 'A test tool',
        input: z.object({ value: z.string() }),
        output: z.object({ result: z.string() }),
      });

      expect(myTool.name).toBe('test');
      expect(myTool.description).toBe('A test tool');
      expect(myTool.tags).toEqual([]);
    });

    it('creates a tool with fluent builder', () => {
      const myTool = tool('test')
        .description('A test tool')
        .input(z.object({ value: z.string() }))
        .output(z.object({ result: z.string() }))
        .tags('tag1', 'tag2')
        .build();

      expect(myTool.name).toBe('test');
      expect(myTool.description).toBe('A test tool');
      expect(myTool.tags).toEqual(['tag1', 'tag2']);
    });

    it('throws error if input schema is missing in builder', () => {
      expect(() => {
        tool('test').build();
      }).toThrow('Tool "test" requires an input schema');
    });
  });

  describe('server handler', () => {
    it('executes server handler when isServer is true', async () => {
      const myTool = tool({
        name: 'serverTest',
        input: z.object({ x: z.number() }),
        output: z.object({ y: z.number() }),
      });

      myTool.server(({ x }) => ({ y: x * 2 }));

      const result = await myTool.run({ x: 5 }, { isServer: true });
      expect(result).toEqual({ y: 10 });
    });

    it('throws error when no server implementation exists', async () => {
      const myTool = tool({
        name: 'noServer',
        input: z.object({ x: z.number() }),
      });

      await expect(myTool.run({ x: 5 }, { isServer: true })).rejects.toThrow(
        'Tool "noServer" has no server implementation'
      );
    });
  });

  describe('input validation', () => {
    it('validates input with Zod schema', async () => {
      const myTool = tool({
        name: 'validate',
        input: z.object({
          email: z.string().email(),
          age: z.number().min(0),
        }),
      });

      myTool.server((input) => input);

      // Invalid email
      await expect(
        myTool.run({ email: 'invalid', age: 25 }, { isServer: true })
      ).rejects.toThrow();

      // Invalid age
      await expect(
        myTool.run({ email: 'test@test.com', age: -1 }, { isServer: true })
      ).rejects.toThrow();

      // Valid input
      const result = await myTool.run(
        { email: 'test@test.com', age: 25 },
        { isServer: true }
      );
      expect(result).toEqual({ email: 'test@test.com', age: 25 });
    });
  });

  describe('output validation', () => {
    it('validates output with Zod schema', async () => {
      const myTool = tool({
        name: 'outputValidate',
        input: z.object({ x: z.number() }),
        output: z.object({ y: z.number().positive() }),
      });

      // Returns invalid output
      myTool.server(() => ({ y: -1 }));

      await expect(myTool.run({ x: 5 }, { isServer: true })).rejects.toThrow();
    });
  });

  describe('caching', () => {
    it('caches results based on TTL', async () => {
      let callCount = 0;

      const myTool = tool({
        name: 'cached',
        input: z.object({ x: z.number() }),
        output: z.object({ y: z.number() }),
        cache: { ttl: 10000 }, // 10 seconds
      });

      myTool.server(({ x }) => {
        callCount++;
        return { y: x * 2 };
      });

      const cache = new Map();
      const ctx = { isServer: true, cache };

      // First call
      const result1 = await myTool.run({ x: 5 }, ctx);
      expect(result1).toEqual({ y: 10 });
      expect(callCount).toBe(1);

      // Second call - should be cached
      const result2 = await myTool.run({ x: 5 }, ctx);
      expect(result2).toEqual({ y: 10 });
      expect(callCount).toBe(1); // Still 1, cached

      // Different input - not cached
      const result3 = await myTool.run({ x: 10 }, ctx);
      expect(result3).toEqual({ y: 20 });
      expect(callCount).toBe(2);
    });

    it('uses custom cache key function', async () => {
      let callCount = 0;

      const myTool = tool({
        name: 'customKey',
        input: z.object({ x: z.number(), ignored: z.string() }),
        cache: {
          ttl: 10000,
          key: (input) => `key:${input.x}`, // Ignore 'ignored' field
        },
      });

      myTool.server(({ x }) => {
        callCount++;
        return { y: x };
      });

      const cache = new Map();
      const ctx = { isServer: true, cache };

      await myTool.run({ x: 5, ignored: 'a' }, ctx);
      expect(callCount).toBe(1);

      // Same x, different ignored - should be cached
      await myTool.run({ x: 5, ignored: 'b' }, ctx);
      expect(callCount).toBe(1);
    });
  });

  describe('security', () => {
    it('strips server context fields on client', async () => {
      let receivedContext: ToolContext | null = null;

      const myTool = tool({
        name: 'contextTest',
        input: z.object({ x: z.number() }),
      });

      myTool.client((input, ctx) => {
        receivedContext = ctx;
        return { result: input.x };
      });

      await myTool.run(
        { x: 5 },
        {
          isServer: false,
          env: { SECRET: 'should-not-appear' },
          headers: new Headers({ 'x-secret': 'hidden' }),
          cookies: { session: 'secret-session' },
          user: { id: 'user123' },
          session: { token: 'secret-token' },
        }
      );

      // Server-only fields should be undefined on client
      expect(receivedContext!.env).toBeUndefined();
      expect(receivedContext!.headers).toBeUndefined();
      expect(receivedContext!.cookies).toBeUndefined();
      expect(receivedContext!.user).toBeUndefined();
      expect(receivedContext!.session).toBeUndefined();
      expect(receivedContext!.isServer).toBe(false);
    });

    it('includes server context fields on server', async () => {
      let receivedContext: ToolContext | null = null;

      const myTool = tool({
        name: 'serverContextTest',
        input: z.object({ x: z.number() }),
      });

      myTool.server((input, ctx) => {
        receivedContext = ctx;
        return { result: input.x };
      });

      await myTool.run(
        { x: 5 },
        {
          isServer: true,
          env: { API_KEY: 'secret-key' },
          user: { id: 'user123' },
        }
      );

      // Server fields should be present
      expect(receivedContext!.env).toEqual({ API_KEY: 'secret-key' });
      expect(receivedContext!.user).toEqual({ id: 'user123' });
      expect(receivedContext!.isServer).toBe(true);
    });

    it('toJSON does not expose handlers or schemas', () => {
      const myTool = tool({
        name: 'jsonTest',
        description: 'Test',
        input: z.object({ secret: z.string() }),
        output: z.object({ result: z.string() }),
      });

      myTool.server(() => ({ result: 'secret logic' }));

      const json = myTool.toJSON();

      expect(json).toEqual({
        name: 'jsonTest',
        description: 'Test',
        tags: [],
        hasServer: true,
        hasClient: false,
        hasView: false,
        hasCache: false,
      });

      // Ensure no handler or schema leakage
      expect(json).not.toHaveProperty('server');
      expect(json).not.toHaveProperty('client');
      expect(json).not.toHaveProperty('inputSchema');
      expect(json).not.toHaveProperty('outputSchema');
    });
  });

  describe('toAITool', () => {
    it('converts to Vercel AI SDK format', () => {
      const myTool = tool({
        name: 'aiTool',
        description: 'An AI tool',
        input: z.object({ prompt: z.string() }),
      });

      myTool.server(({ prompt }) => ({ response: `Echo: ${prompt}` }));

      const aiTool = myTool.toAITool();

      expect(aiTool.description).toBe('An AI tool');
      expect(aiTool.inputSchema).toBe(myTool.inputSchema);
      expect(typeof aiTool.execute).toBe('function');
    });

    it('executes with isServer: true', async () => {
      let wasServer = false;

      const myTool = tool({
        name: 'aiServerTest',
        input: z.object({ x: z.number() }),
      });

      myTool.server((_, ctx) => {
        wasServer = ctx.isServer;
        return { y: 1 };
      });

      const aiTool = myTool.toAITool();
      await aiTool.execute({ x: 5 });

      expect(wasServer).toBe(true);
    });
  });

  describe('client execution', () => {
    it('uses client handler when defined', async () => {
      const myTool = tool({
        name: 'clientHandler',
        input: z.object({ x: z.number() }),
      });

      myTool.server(() => ({ source: 'server' }));
      myTool.client(() => ({ source: 'client' }));

      const result = await myTool.run({ x: 5 }, { isServer: false });
      expect(result).toEqual({ source: 'client' });
    });

    it('calls _defaultClientFetch when no client handler on client side', async () => {
      const myTool = tool({
        name: 'autoFetch',
        input: z.object({ x: z.number() }),
        clientFetch: { endpoint: '/api/test' },
      });

      myTool.server(() => ({ y: 1 }));

      // Mock fetch
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: { y: 42 } }),
      });

      const result = await myTool.run(
        { x: 5 },
        { isServer: false, fetch: mockFetch as any }
      );

      expect(mockFetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: 'autoFetch', input: { x: 5 } }),
      });
      expect(result).toEqual({ y: 42 });
    });

    it('uses default endpoint when clientFetch not configured', async () => {
      const myTool = tool({
        name: 'defaultEndpoint',
        input: z.object({ x: z.number() }),
      });

      myTool.server(() => ({ y: 1 }));

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: { y: 42 } }),
      });

      await myTool.run({ x: 5 }, { isServer: false, fetch: mockFetch as any });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tools/execute',
        expect.anything()
      );
    });

    it('handles fetch errors gracefully', async () => {
      const myTool = tool({
        name: 'fetchError',
        input: z.object({ x: z.number() }),
      });

      myTool.server(() => ({ y: 1 }));

      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Something went wrong' }),
      });

      await expect(
        myTool.run({ x: 5 }, { isServer: false, fetch: mockFetch as any })
      ).rejects.toThrow('Something went wrong');
    });
  });

  describe('hasServer/hasClient/hasView', () => {
    it('correctly reports handler presence', () => {
      const myTool = tool({
        name: 'presence',
        input: z.object({ x: z.number() }),
      });

      expect(myTool.hasServer).toBe(false);
      expect(myTool.hasClient).toBe(false);
      expect(myTool.hasView).toBe(false);

      myTool.server(() => ({}));
      expect(myTool.hasServer).toBe(true);

      myTool.client(() => ({}));
      expect(myTool.hasClient).toBe(true);
    });
  });

  describe('call() alias', () => {
    it('call() is an alias for run()', async () => {
      const myTool = tool({
        name: 'alias',
        input: z.object({ x: z.number() }),
      });

      myTool.server(({ x }) => ({ y: x * 2 }));

      const result = await myTool.call({ x: 5 }, { isServer: true });
      expect(result).toEqual({ y: 10 });
    });
  });
});
