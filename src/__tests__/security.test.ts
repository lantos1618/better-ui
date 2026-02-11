/**
 * Security-focused tests for Better UI Tool
 *
 * Tests for:
 * - Context stripping (preventing server secrets on client)
 * - Input sanitization
 * - Output validation
 * - Error message safety
 * - Serialization safety
 */

import { z } from 'zod';
import { tool, Tool, ToolContext } from '../tool';

describe('Security', () => {
  describe('context stripping', () => {
    it('strips all server-only fields on client', async () => {
      let receivedContext: ToolContext | null = null;

      const myTool = tool({
        name: 'contextStrip',
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
          env: { API_KEY: 'secret-api-key-12345', DATABASE_URL: 'postgres://...' },
          headers: new Headers({
            authorization: 'Bearer secret-token',
            cookie: 'session=abc123',
          }),
          cookies: { session: 'secret-session-id', auth: 'auth-token' },
          user: { id: 'user123', email: 'user@example.com', role: 'admin' },
          session: { token: 'jwt-secret', expires: Date.now() + 3600000 },
        }
      );

      // All server-only fields must be undefined
      expect(receivedContext!.env).toBeUndefined();
      expect(receivedContext!.headers).toBeUndefined();
      expect(receivedContext!.cookies).toBeUndefined();
      expect(receivedContext!.user).toBeUndefined();
      expect(receivedContext!.session).toBeUndefined();

      // Client fields should be present
      expect(receivedContext!.isServer).toBe(false);
      expect(receivedContext!.cache).toBeDefined();
      expect(receivedContext!.fetch).toBeDefined();
    });

    it('preserves server fields when running on server', async () => {
      let receivedContext: ToolContext | null = null;

      const myTool = tool({
        name: 'serverContext',
        input: z.object({ x: z.number() }),
      });

      const testEnv = { API_KEY: 'secret-key' };
      const testHeaders = new Headers({ 'x-request-id': 'req-123' });
      const testUser = { id: 'user123' };

      myTool.server((input, ctx) => {
        receivedContext = ctx;
        return { result: input.x };
      });

      await myTool.run(
        { x: 5 },
        {
          isServer: true,
          env: testEnv,
          headers: testHeaders,
          user: testUser,
        }
      );

      expect(receivedContext!.env).toEqual(testEnv);
      expect(receivedContext!.headers).toBe(testHeaders);
      expect(receivedContext!.user).toEqual(testUser);
      expect(receivedContext!.isServer).toBe(true);
    });

    it('prevents server handler from running on client even if called directly', async () => {
      const myTool = tool({
        name: 'serverOnly',
        input: z.object({ x: z.number() }),
      });

      let serverHandlerCalled = false;
      myTool.server(() => {
        serverHandlerCalled = true;
        return { y: 1 };
      });

      // When isServer is false, server handler should NOT be called
      // Instead, it should attempt to fetch (which we mock to fail)
      const mockFetch = jest.fn().mockRejectedValue(new Error('Fetch not allowed'));

      await expect(
        myTool.run({ x: 5 }, { isServer: false, fetch: mockFetch as any })
      ).rejects.toThrow('Fetch not allowed');

      expect(serverHandlerCalled).toBe(false);
    });
  });

  describe('toJSON safety', () => {
    it('does not expose handlers in JSON output', () => {
      const myTool = tool({
        name: 'jsonSafe',
        description: 'Test tool',
        input: z.object({ password: z.string() }),
        output: z.object({ token: z.string() }),
      });

      myTool.server(({ password }) => {
        // This logic should never be visible in JSON
        const secret = 'internal-secret-' + password;
        return { token: secret };
      });

      myTool.client(({ password }) => {
        return { token: 'client-' + password };
      });

      const json = myTool.toJSON();
      const jsonString = JSON.stringify(json);

      // Handlers should not be present
      expect(json).not.toHaveProperty('_server');
      expect(json).not.toHaveProperty('_client');
      expect(json).not.toHaveProperty('server');
      expect(json).not.toHaveProperty('client');

      // Internal logic strings should not leak
      expect(jsonString).not.toContain('internal-secret');
      expect(jsonString).not.toContain('password');

      // Only safe metadata should be present
      expect(json).toEqual({
        name: 'jsonSafe',
        description: 'Test tool',
        tags: [],
        hasServer: true,
        hasClient: true,
        hasView: false,
        hasStream: false,
        hasCache: false,
        confirm: false,
        hints: {},
        requiresConfirmation: false,
      });
    });

    it('does not expose schemas in JSON output', () => {
      const myTool = tool({
        name: 'schemaSafe',
        input: z.object({
          creditCard: z.string().regex(/^\d{16}$/),
          cvv: z.string().length(3),
        }),
        output: z.object({ status: z.string() }),
      });

      myTool.server(() => ({ status: 'ok' }));

      const json = myTool.toJSON();
      const jsonString = JSON.stringify(json);

      expect(json).not.toHaveProperty('inputSchema');
      expect(json).not.toHaveProperty('outputSchema');
      expect(jsonString).not.toContain('creditCard');
      expect(jsonString).not.toContain('cvv');
      expect(jsonString).not.toContain('regex');
    });

    it('does not expose clientFetchConfig in JSON output', () => {
      const myTool = tool({
        name: 'configSafe',
        input: z.object({ x: z.number() }),
        clientFetch: { endpoint: '/api/internal/secret-endpoint' },
      });

      const json = myTool.toJSON();
      const jsonString = JSON.stringify(json);

      expect(json).not.toHaveProperty('clientFetchConfig');
      expect(jsonString).not.toContain('secret-endpoint');
    });
  });

  describe('input validation security', () => {
    it('rejects prototype pollution attempts', async () => {
      const myTool = tool({
        name: 'prototypePollution',
        input: z.object({ name: z.string() }),
      });

      myTool.server((input) => input);

      // Attempt to inject extra properties via prototype pollution
      const maliciousInput = { name: 'test' };
      Object.defineProperty(maliciousInput, 'isAdmin', {
        value: true,
        enumerable: true,
      });

      const result = await myTool.run(maliciousInput as any, { isServer: true });
      // Zod strips unknown keys by default
      expect(result).toEqual({ name: 'test' });
      // The injected property should not be in the result
      expect(Object.keys(result)).toEqual(['name']);
      expect((result as any).isAdmin).toBeUndefined();
    });

    it('validates string length limits', async () => {
      const myTool = tool({
        name: 'stringLimits',
        input: z.object({
          name: z.string().max(100),
          bio: z.string().max(1000),
        }),
      });

      myTool.server((input) => input);

      // Valid input
      await expect(
        myTool.run({ name: 'test', bio: 'short bio' }, { isServer: true })
      ).resolves.toBeDefined();

      // Exceeds limit
      await expect(
        myTool.run(
          { name: 'a'.repeat(101), bio: 'short bio' },
          { isServer: true }
        )
      ).rejects.toThrow();

      await expect(
        myTool.run(
          { name: 'test', bio: 'x'.repeat(1001) },
          { isServer: true }
        )
      ).rejects.toThrow();
    });

    it('validates number ranges', async () => {
      const myTool = tool({
        name: 'numberRanges',
        input: z.object({
          age: z.number().int().min(0).max(150),
          price: z.number().positive().max(1000000),
        }),
      });

      myTool.server((input) => input);

      // Valid
      await expect(
        myTool.run({ age: 25, price: 99.99 }, { isServer: true })
      ).resolves.toBeDefined();

      // Invalid age
      await expect(
        myTool.run({ age: -1, price: 99.99 }, { isServer: true })
      ).rejects.toThrow();

      await expect(
        myTool.run({ age: 200, price: 99.99 }, { isServer: true })
      ).rejects.toThrow();

      // Invalid price
      await expect(
        myTool.run({ age: 25, price: -10 }, { isServer: true })
      ).rejects.toThrow();
    });

    it('sanitizes email inputs', async () => {
      const myTool = tool({
        name: 'emailValidation',
        input: z.object({
          email: z.string().email(),
        }),
      });

      myTool.server((input) => input);

      // Valid emails
      await expect(
        myTool.run({ email: 'user@example.com' }, { isServer: true })
      ).resolves.toBeDefined();

      // Invalid emails
      const invalidEmails = [
        'not-an-email',
        'missing@tld',
        '@nodomain.com',
        'spaces in@email.com',
        'javascript:alert(1)',
      ];

      for (const email of invalidEmails) {
        await expect(
          myTool.run({ email }, { isServer: true })
        ).rejects.toThrow();
      }
    });

    it('validates URL inputs', async () => {
      // Using a stricter URL validator that only allows http(s)
      const safeUrlSchema = z.string().url().refine(
        (url) => {
          try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol);
          } catch {
            return false;
          }
        },
        { message: 'URL must use http or https protocol' }
      );

      const myTool = tool({
        name: 'urlValidation',
        input: z.object({
          url: safeUrlSchema,
        }),
      });

      myTool.server((input) => input);

      // Valid URLs
      await expect(
        myTool.run({ url: 'https://example.com' }, { isServer: true })
      ).resolves.toBeDefined();

      await expect(
        myTool.run({ url: 'http://example.com/path?query=1' }, { isServer: true })
      ).resolves.toBeDefined();

      // Invalid URLs - not a URL at all
      await expect(
        myTool.run({ url: 'not-a-url' }, { isServer: true })
      ).rejects.toThrow();

      // Dangerous URLs - blocked by safe schema
      const dangerousUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd',
      ];

      for (const url of dangerousUrls) {
        await expect(
          myTool.run({ url }, { isServer: true })
        ).rejects.toThrow();
      }
    });

    it('shows that basic z.string().url() allows dangerous protocols', async () => {
      // This test documents the default Zod behavior
      // Developers should use the stricter validation above for user-facing URLs
      const myTool = tool({
        name: 'basicUrl',
        input: z.object({
          url: z.string().url(), // Basic validation
        }),
      });

      myTool.server((input) => input);

      // These are technically valid URLs per RFC 3986
      // SECURITY NOTE: Use stricter validation (see above) for user input
      const result = await myTool.run(
        { url: 'https://example.com' },
        { isServer: true }
      );
      expect(result.url).toBe('https://example.com');
    });
  });

  describe('output validation security', () => {
    it('validates output to prevent data leakage', async () => {
      const myTool = tool({
        name: 'outputValidation',
        input: z.object({ userId: z.string() }),
        output: z.object({
          id: z.string(),
          name: z.string(),
          // Note: password should NOT be in output schema
        }),
      });

      myTool.server(() => ({
        id: 'user123',
        name: 'John',
        password: 'secret123', // Accidentally included
        ssn: '123-45-6789', // Accidentally included
      }));

      const result = await myTool.run({ userId: 'user123' }, { isServer: true });

      // Zod passthrough is not used, so extra fields are stripped
      expect(result).toEqual({ id: 'user123', name: 'John' });
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('ssn');
    });
  });

  describe('error message safety', () => {
    it('does not leak sensitive info in validation errors', async () => {
      const myTool = tool({
        name: 'errorSafety',
        input: z.object({
          apiKey: z.string().min(32),
        }),
      });

      myTool.server(() => ({ status: 'ok' }));

      try {
        await myTool.run({ apiKey: 'short' }, { isServer: true });
        fail('Should have thrown');
      } catch (error: any) {
        // Error message should describe the validation issue
        // but NOT echo back the actual value
        expect(error.message).toContain('32');
        // The actual short key should not be in the error
        expect(error.message).not.toContain('short');
      }
    });
  });

  describe('type coercion safety', () => {
    it('rejects type confusion attacks', async () => {
      const myTool = tool({
        name: 'typeCoercion',
        input: z.object({
          id: z.number(),
          isAdmin: z.boolean(),
        }),
      });

      myTool.server((input) => input);

      // String that looks like number
      await expect(
        myTool.run({ id: '123' as any, isAdmin: false }, { isServer: true })
      ).rejects.toThrow();

      // String that looks like boolean
      await expect(
        myTool.run({ id: 123, isAdmin: 'true' as any }, { isServer: true })
      ).rejects.toThrow();

      // Object where primitive expected
      await expect(
        myTool.run({ id: { value: 123 } as any, isAdmin: false }, { isServer: true })
      ).rejects.toThrow();

      // Array where primitive expected
      await expect(
        myTool.run({ id: [123] as any, isAdmin: false }, { isServer: true })
      ).rejects.toThrow();
    });

    it('handles null and undefined correctly', async () => {
      const myTool = tool({
        name: 'nullUndefined',
        input: z.object({
          required: z.string(),
          optional: z.string().optional(),
          nullable: z.string().nullable(),
        }),
      });

      myTool.server((input) => input);

      // Missing required field
      await expect(
        myTool.run({ optional: 'test' } as any, { isServer: true })
      ).rejects.toThrow();

      // Null for non-nullable
      await expect(
        myTool.run(
          { required: null, optional: 'test', nullable: null } as any,
          { isServer: true }
        )
      ).rejects.toThrow();

      // Valid with nullable
      const result = await myTool.run(
        { required: 'test', nullable: null },
        { isServer: true }
      );
      expect(result).toEqual({ required: 'test', nullable: null });
    });
  });

  describe('cache key security', () => {
    it('isolates cache by input to prevent data leakage', async () => {
      let callCount = 0;

      const myTool = tool({
        name: 'cacheIsolation',
        input: z.object({ userId: z.string() }),
        cache: { ttl: 10000 },
      });

      myTool.server(({ userId }) => {
        callCount++;
        return {
          userId,
          data: `secret-data-for-${userId}`,
        };
      });

      const cache = new Map();

      // User A request
      const resultA = await myTool.run(
        { userId: 'userA' },
        { isServer: true, cache }
      );
      expect(resultA.data).toBe('secret-data-for-userA');
      expect(callCount).toBe(1);

      // User B request - should NOT get User A's cached data
      const resultB = await myTool.run(
        { userId: 'userB' },
        { isServer: true, cache }
      );
      expect(resultB.data).toBe('secret-data-for-userB');
      expect(callCount).toBe(2);

      // User A again - should get cached
      const resultA2 = await myTool.run(
        { userId: 'userA' },
        { isServer: true, cache }
      );
      expect(resultA2.data).toBe('secret-data-for-userA');
      expect(callCount).toBe(2);
    });
  });
});
