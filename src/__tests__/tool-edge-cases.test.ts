/**
 * Edge case tests for the Tool class
 * Covers boundary conditions, error paths, and security edge cases
 */
import { tool, Tool } from '../tool';
import { z } from 'zod';

describe('Tool edge cases', () => {
  describe('schema validation', () => {
    it('strips unknown keys from input', async () => {
      const t = tool({
        name: 'strict',
        input: z.object({ name: z.string() }),
        output: z.object({ greeting: z.string() }),
      });
      t.server(async ({ name }) => ({ greeting: `Hello ${name}` }));

      // Pass extra fields — they should be stripped
      const result = await t.run(
        { name: 'Alice', evil: 'payload' } as any,
        { isServer: true }
      );
      expect(result.greeting).toBe('Hello Alice');
    });

    it('validates output and strips extra fields', async () => {
      const t = tool({
        name: 'leaky',
        input: z.object({}),
        output: z.object({ safe: z.string() }),
      });
      t.server(async () => ({ safe: 'ok', secret: 'ssn-123' } as any));

      const result = await t.run({}, { isServer: true });
      expect(result.safe).toBe('ok');
      expect((result as any).secret).toBeUndefined();
    });

    it('rejects invalid input types', async () => {
      const t = tool({
        name: 'typed',
        input: z.object({ count: z.number() }),
        output: z.object({ result: z.number() }),
      });
      t.server(async ({ count }) => ({ result: count * 2 }));

      await expect(
        t.run({ count: 'not a number' } as any, { isServer: true })
      ).rejects.toThrow();
    });

    it('handles optional fields correctly', async () => {
      const t = tool({
        name: 'optional',
        input: z.object({
          required: z.string(),
          optional: z.string().optional(),
        }),
        output: z.object({ result: z.string() }),
      });
      t.server(async ({ required, optional }) => ({
        result: optional ? `${required}-${optional}` : required,
      }));

      const result = await t.run({ required: 'hello' }, { isServer: true });
      expect(result.result).toBe('hello');
    });

    it('validates nested objects', async () => {
      const t = tool({
        name: 'nested',
        input: z.object({
          user: z.object({
            name: z.string(),
            age: z.number().min(0),
          }),
        }),
        output: z.object({ valid: z.boolean() }),
      });
      t.server(async () => ({ valid: true }));

      await expect(
        t.run({ user: { name: 'Bob', age: -1 } }, { isServer: true })
      ).rejects.toThrow();
    });

    it('handles array inputs', async () => {
      const t = tool({
        name: 'arrayInput',
        input: z.object({
          items: z.array(z.string()).min(1).max(10),
        }),
        output: z.object({ count: z.number() }),
      });
      t.server(async ({ items }) => ({ count: items.length }));

      const result = await t.run({ items: ['a', 'b', 'c'] }, { isServer: true });
      expect(result.count).toBe(3);

      await expect(
        t.run({ items: [] }, { isServer: true })
      ).rejects.toThrow();
    });

    it('handles enum inputs', async () => {
      const t = tool({
        name: 'enumInput',
        input: z.object({
          role: z.enum(['admin', 'user', 'guest']),
        }),
        output: z.object({ allowed: z.boolean() }),
      });
      t.server(async ({ role }) => ({ allowed: role === 'admin' }));

      const result = await t.run({ role: 'admin' }, { isServer: true });
      expect(result.allowed).toBe(true);

      await expect(
        t.run({ role: 'superadmin' } as any, { isServer: true })
      ).rejects.toThrow();
    });
  });

  describe('handler behavior', () => {
    it('throws when no server handler is defined and isServer=true', async () => {
      const t = tool({
        name: 'noHandler',
        input: z.object({}),
        output: z.object({}),
      });

      await expect(
        t.run({}, { isServer: true })
      ).rejects.toThrow();
    });

    it('supports async server handlers', async () => {
      const t = tool({
        name: 'async',
        input: z.object({ delay: z.number() }),
        output: z.object({ done: z.boolean() }),
      });
      t.server(async ({ delay }) => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return { done: true };
      });

      const result = await t.run({ delay: 10 }, { isServer: true });
      expect(result.done).toBe(true);
    });
  });

  describe('toAITool', () => {
    it('returns correct structure', () => {
      const t = tool({
        name: 'aiTool',
        description: 'Test tool',
        input: z.object({ query: z.string() }),
        output: z.object({ result: z.string() }),
      });
      t.server(async () => ({ result: 'ok' }));

      const aiTool = t.toAITool();
      expect(aiTool.description).toBe('Test tool');
      expect(aiTool.inputSchema).toBeDefined();
    });

    it('omits execute when confirm is true', () => {
      const t = tool({
        name: 'confirmTool',
        confirm: true,
        input: z.object({}),
        output: z.object({}),
      });
      t.server(async () => ({}));

      const aiTool = t.toAITool();
      expect(aiTool.execute).toBeUndefined();
    });

    it('includes execute when confirm is false', () => {
      const t = tool({
        name: 'noConfirm',
        confirm: false,
        input: z.object({}),
        output: z.object({}),
      });
      t.server(async () => ({}));

      const aiTool = t.toAITool();
      expect(aiTool.execute).toBeDefined();
    });

    it('omits execute when hints.destructive is true', () => {
      const t = tool({
        name: 'destructive',
        hints: { destructive: true },
        input: z.object({}),
        output: z.object({}),
      });
      t.server(async () => ({}));

      const aiTool = t.toAITool();
      expect(aiTool.execute).toBeUndefined();
    });
  });

  describe('toJSON', () => {
    it('excludes handlers and schemas', () => {
      const t = tool({
        name: 'jsonTool',
        description: 'A test tool',
        tags: ['test'],
        input: z.object({ x: z.number() }),
        output: z.object({ y: z.number() }),
      });
      t.server(async ({ x }) => ({ y: x * 2 }));

      const json = t.toJSON();
      expect(json.name).toBe('jsonTool');
      expect(json.description).toBe('A test tool');
      expect(json.tags).toEqual(['test']);
      // Should NOT have handlers or schemas
      expect((json as any).serverHandler).toBeUndefined();
      expect((json as any).inputSchema).toBeUndefined();
    });
  });

  describe('fluent builder', () => {
    it('builds a complete tool with chained methods', async () => {
      const t = tool('builderTest')
        .description('Built with builder')
        .input(z.object({ value: z.number() }))
        .output(z.object({ doubled: z.number() }))
        .server(async ({ value }) => ({ doubled: value * 2 }))
        .build();

      expect(t.name).toBe('builderTest');
      expect(t.description).toBe('Built with builder');
      const result = await t.run({ value: 5 }, { isServer: true });
      expect(result.doubled).toBe(10);
    });

    it('supports tags, cache, confirm, hints via builder', () => {
      const t = tool('configured')
        .input(z.object({}))
        .output(z.object({}))
        .tags('a', 'b')
        .cache({ ttl: 5000 })
        .requireConfirm(true)
        .hints({ destructive: true, readOnly: false })
        .server(async () => ({}))
        .build();

      expect(t.tags).toEqual(['a', 'b']);
      const json = t.toJSON();
      expect(json.tags).toEqual(['a', 'b']);
    });
  });

  describe('runStream', () => {
    it('yields single result when no stream handler', async () => {
      const t = tool({
        name: 'noStream',
        input: z.object({ x: z.number() }),
        output: z.object({ y: z.number() }),
      });
      t.server(async ({ x }) => ({ y: x + 1 }));

      const chunks = [];
      for await (const chunk of t.runStream({ x: 5 }, { isServer: true })) {
        chunks.push(chunk);
      }
      expect(chunks).toHaveLength(1);
      expect(chunks[0].done).toBe(true);
      expect(chunks[0].partial.y).toBe(6);
    });

    it('yields multiple chunks with stream handler', async () => {
      const t = tool({
        name: 'withStream',
        input: z.object({}),
        output: z.object({ status: z.string(), count: z.number().optional() }),
      });
      t.stream(async (_input, { stream }) => {
        stream({ status: 'starting' });
        stream({ status: 'working', count: 1 });
        stream({ status: 'done', count: 2 });
        return { status: 'done', count: 2 };
      });

      const chunks = [];
      for await (const chunk of t.runStream({}, { isServer: true })) {
        chunks.push(chunk);
      }
      expect(chunks.length).toBeGreaterThanOrEqual(2);
      expect(chunks[chunks.length - 1].done).toBe(true);
    });
  });

  describe('context stripping', () => {
    it('strips server-only fields on client', async () => {
      const t = tool({
        name: 'ctxTest',
        input: z.object({}),
        output: z.object({ hasEnv: z.boolean() }),
      });
      // We need to set up a client handler to test context stripping
      t.client(async (_input, ctx) => {
        return { hasEnv: ctx?.env !== undefined };
      });

      const result = await t.run({}, {
        isServer: false,
        env: { SECRET: 'value' },
      } as any);
      // On client, env should be stripped
      expect(result.hasEnv).toBe(false);
    });
  });

  describe('caching', () => {
    it('returns cached result within TTL', async () => {
      let callCount = 0;
      const t = tool({
        name: 'cached',
        input: z.object({ key: z.string() }),
        output: z.object({ value: z.number() }),
        cache: { ttl: 10000 },
      });
      t.server(async () => {
        callCount++;
        return { value: callCount };
      });

      const cache = new Map();
      const ctx = { isServer: true, cache };

      const r1 = await t.run({ key: 'a' }, ctx);
      const r2 = await t.run({ key: 'a' }, ctx);

      // Both should return same value (cached)
      expect(r1.value).toBe(r2.value);
    });
  });
});
