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
        hasStream: false,
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

  describe('cache expiration', () => {
    it('expires cache after TTL', async () => {
      let callCount = 0;

      const myTool = tool({
        name: 'expiring',
        input: z.object({ x: z.number() }),
        cache: { ttl: 100 }, // 100ms TTL
      });

      myTool.server(({ x }) => {
        callCount++;
        return { y: x * 2 };
      });

      const cache = new Map();
      const ctx = { isServer: true, cache };

      // First call
      await myTool.run({ x: 5 }, ctx);
      expect(callCount).toBe(1);

      // Immediate second call - cached
      await myTool.run({ x: 5 }, ctx);
      expect(callCount).toBe(1);

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Third call - cache expired
      await myTool.run({ x: 5 }, ctx);
      expect(callCount).toBe(2);
    });
  });

  describe('concurrent execution', () => {
    it('handles multiple concurrent runs', async () => {
      let callCount = 0;

      const myTool = tool({
        name: 'concurrent',
        input: z.object({ x: z.number() }),
      });

      myTool.server(async ({ x }) => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { y: x * 2 };
      });

      // Run 5 concurrent calls
      const promises = [1, 2, 3, 4, 5].map((x) =>
        myTool.run({ x }, { isServer: true })
      );

      const results = await Promise.all(promises);

      expect(callCount).toBe(5);
      expect(results).toEqual([
        { y: 2 },
        { y: 4 },
        { y: 6 },
        { y: 8 },
        { y: 10 },
      ]);
    });

    it('handles concurrent runs with shared cache', async () => {
      let callCount = 0;

      const myTool = tool({
        name: 'concurrentCached',
        input: z.object({ x: z.number() }),
        cache: { ttl: 10000 },
      });

      myTool.server(async ({ x }) => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { y: x * 2 };
      });

      const cache = new Map();

      // Run concurrent calls with same input
      const promises = [5, 5, 5].map((x) =>
        myTool.run({ x }, { isServer: true, cache })
      );

      const results = await Promise.all(promises);

      // First call runs, others may or may not be cached depending on timing
      // But all results should be correct
      expect(results.every((r) => r.y === 10)).toBe(true);
    });
  });

  describe('async error handling', () => {
    it('handles async server errors', async () => {
      const myTool = tool({
        name: 'asyncError',
        input: z.object({ x: z.number() }),
      });

      myTool.server(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error('Async error');
      });

      await expect(myTool.run({ x: 5 }, { isServer: true })).rejects.toThrow(
        'Async error'
      );
    });

    it('handles async client errors', async () => {
      const myTool = tool({
        name: 'asyncClientError',
        input: z.object({ x: z.number() }),
      });

      myTool.client(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error('Async client error');
      });

      await expect(myTool.run({ x: 5 }, { isServer: false })).rejects.toThrow(
        'Async client error'
      );
    });
  });

  describe('edge cases', () => {
    it('handles empty input object', async () => {
      const myTool = tool({
        name: 'emptyInput',
        input: z.object({}),
      });

      myTool.server(() => ({ result: 'success' }));

      const result = await myTool.run({}, { isServer: true });
      expect(result).toEqual({ result: 'success' });
    });

    it('handles deeply nested input validation', async () => {
      const myTool = tool({
        name: 'nestedInput',
        input: z.object({
          user: z.object({
            profile: z.object({
              settings: z.object({
                theme: z.enum(['light', 'dark']),
              }),
            }),
          }),
        }),
      });

      myTool.server((input) => input);

      const validInput = {
        user: { profile: { settings: { theme: 'dark' as const } } },
      };

      const result = await myTool.run(validInput, { isServer: true });
      expect(result).toEqual(validInput);

      // Invalid deep nesting
      const invalidInput = {
        user: { profile: { settings: { theme: 'invalid' } } },
      };

      await expect(
        myTool.run(invalidInput as any, { isServer: true })
      ).rejects.toThrow();
    });

    it('handles array inputs', async () => {
      const myTool = tool({
        name: 'arrayInput',
        input: z.object({
          items: z.array(z.number()).min(1).max(10),
        }),
      });

      myTool.server(({ items }) => ({ sum: items.reduce((a, b) => a + b, 0) }));

      const result = await myTool.run({ items: [1, 2, 3] }, { isServer: true });
      expect(result).toEqual({ sum: 6 });

      // Empty array should fail
      await expect(
        myTool.run({ items: [] }, { isServer: true })
      ).rejects.toThrow();

      // Too many items should fail
      await expect(
        myTool.run({ items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }, { isServer: true })
      ).rejects.toThrow();
    });

    it('handles optional fields', async () => {
      const myTool = tool({
        name: 'optionalFields',
        input: z.object({
          required: z.string(),
          optional: z.string().optional(),
          defaulted: z.number().default(42),
        }),
      });

      myTool.server((input) => input);

      // Without optional
      const result1 = await myTool.run(
        { required: 'test' },
        { isServer: true }
      );
      expect(result1).toEqual({ required: 'test', defaulted: 42 });

      // With optional
      const result2 = await myTool.run(
        { required: 'test', optional: 'present' },
        { isServer: true }
      );
      expect(result2).toEqual({
        required: 'test',
        optional: 'present',
        defaulted: 42,
      });
    });

    it('throws when running on client without implementation', async () => {
      const myTool = tool({
        name: 'noImpl',
        input: z.object({ x: z.number() }),
      });

      await expect(myTool.run({ x: 5 }, { isServer: false })).rejects.toThrow(
        'Tool "noImpl" has no implementation'
      );
    });
  });

  describe('fetch error scenarios', () => {
    it('handles network failure in _defaultClientFetch', async () => {
      const myTool = tool({
        name: 'networkFail',
        input: z.object({ x: z.number() }),
      });

      myTool.server(() => ({ y: 1 }));

      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        myTool.run({ x: 5 }, { isServer: false, fetch: mockFetch as any })
      ).rejects.toThrow('Network error');
    });

    it('handles non-JSON error response', async () => {
      const myTool = tool({
        name: 'nonJsonError',
        input: z.object({ x: z.number() }),
      });

      myTool.server(() => ({ y: 1 }));

      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Not JSON')),
      });

      await expect(
        myTool.run({ x: 5 }, { isServer: false, fetch: mockFetch as any })
      ).rejects.toThrow('Tool execution failed: Internal Server Error');
    });

    it('handles various response data formats', async () => {
      const myTool = tool({
        name: 'formats',
        input: z.object({ x: z.number() }),
      });

      myTool.server(() => ({ y: 1 }));

      // Format: { result: ... }
      const mockFetch1 = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: { y: 42 } }),
      });
      const result1 = await myTool.run(
        { x: 5 },
        { isServer: false, fetch: mockFetch1 as any }
      );
      expect(result1).toEqual({ y: 42 });

      // Format: { data: ... }
      const mockFetch2 = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { y: 43 } }),
      });
      const result2 = await myTool.run(
        { x: 5 },
        { isServer: false, fetch: mockFetch2 as any }
      );
      expect(result2).toEqual({ y: 43 });

      // Format: direct data
      const mockFetch3 = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ y: 44 }),
      });
      const result3 = await myTool.run(
        { x: 5 },
        { isServer: false, fetch: mockFetch3 as any }
      );
      expect(result3).toEqual({ y: 44 });
    });
  });
});

describe('ToolBuilder', () => {
  describe('fluent API edge cases', () => {
    it('allows chaining in any order', () => {
      const t1 = tool('test1')
        .description('desc')
        .input(z.object({ x: z.number() }))
        .tags('a', 'b')
        .build();

      const t2 = tool('test2')
        .input(z.object({ x: z.number() }))
        .description('desc')
        .tags('a', 'b')
        .build();

      expect(t1.description).toBe('desc');
      expect(t2.description).toBe('desc');
    });

    it('preserves handlers through build()', () => {
      let serverCalled = false;
      let clientCalled = false;

      const myTool = tool('test')
        .input(z.object({ x: z.number() }))
        .server(() => {
          serverCalled = true;
          return { y: 1 };
        })
        .client(() => {
          clientCalled = true;
          return { y: 2 };
        })
        .build();

      expect(myTool.hasServer).toBe(true);
      expect(myTool.hasClient).toBe(true);
    });

    it('supports view in builder', () => {
      const myTool = tool('viewBuilder')
        .input(z.object({ x: z.number() }))
        .view((data) => null) // Simple view for testing
        .build();

      expect(myTool.hasView).toBe(true);
    });

    it('auto-builds when calling run()', async () => {
      const builder = tool('autoBuild')
        .input(z.object({ x: z.number() }))
        .server(({ x }) => ({ y: x * 2 }));

      // Calling run() on builder should auto-build
      const result = await builder.run({ x: 5 }, { isServer: true });
      expect(result).toEqual({ y: 10 });
    });

    it('auto-builds when accessing View', () => {
      const builder = tool('autoBuildView')
        .input(z.object({ x: z.number() }))
        .view((data) => null); // Simple view for testing

      // Accessing View should auto-build
      const View = builder.View;
      expect(View).toBeDefined();
    });

    it('auto-builds when calling toJSON()', () => {
      const builder = tool('autoBuildJson')
        .input(z.object({ x: z.number() }))
        .description('test');

      const json = builder.toJSON();
      expect(json.name).toBe('autoBuildJson');
      expect(json.description).toBe('test');
    });

    it('auto-builds when calling toAITool()', () => {
      const builder = tool('autoBuildAI')
        .input(z.object({ x: z.number() }))
        .description('AI tool');

      const aiTool = builder.toAITool();
      expect(aiTool.description).toBe('AI tool');
    });

    it('supports clientFetch config', async () => {
      const myTool = tool('customEndpoint')
        .input(z.object({ x: z.number() }))
        .clientFetch({ endpoint: '/api/custom' })
        .server(() => ({ y: 1 }))
        .build();

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ result: { y: 99 } }),
      });

      await myTool.run({ x: 5 }, { isServer: false, fetch: mockFetch as any });

      expect(mockFetch).toHaveBeenCalledWith('/api/custom', expect.anything());
    });

    it('supports cache config in builder', async () => {
      let callCount = 0;

      const myTool = tool('builderCache')
        .input(z.object({ x: z.number() }))
        .cache({ ttl: 10000 })
        .server(({ x }) => {
          callCount++;
          return { y: x };
        })
        .build();

      const cache = new Map();
      await myTool.run({ x: 5 }, { isServer: true, cache });
      await myTool.run({ x: 5 }, { isServer: true, cache });

      expect(callCount).toBe(1);
    });

    it('allows multiple tags() calls', () => {
      const myTool = tool('multiTags')
        .input(z.object({ x: z.number() }))
        .tags('a')
        .tags('b', 'c')
        .tags('d')
        .build();

      expect(myTool.tags).toEqual(['a', 'b', 'c', 'd']);
    });
  });
});
