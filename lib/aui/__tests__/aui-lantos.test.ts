import { describe, it, expect, beforeEach } from '@jest/globals';
import aui, { z } from '../index';

describe('Lantos AUI - Concise API Tests', () => {
  beforeEach(() => {
    aui.clear();
  });

  describe('Simple Tool Pattern', () => {
    it('should create a tool with just 2 methods', async () => {
      const tool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }));

      expect(tool.name).toBe('weather');
      
      const result = await tool.run({ city: 'Tokyo' });
      expect(result).toEqual({ temp: 72, city: 'Tokyo' });
    });

    it('should work without input schema', async () => {
      const tool = aui
        .tool('ping')
        .execute(() => 'pong');

      const result = await tool.run({});
      expect(result).toBe('pong');
    });
  });

  describe('Complex Tool Pattern', () => {
    it('should support client execution', async () => {
      const tool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ server: input.query }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.query);
          return cached || { client: input.query };
        });

      // Without context, uses execute
      const serverResult = await tool.run({ query: 'test' });
      expect(serverResult).toEqual({ server: 'test' });

      // With context, uses clientExecute
      const ctx = aui.createContext();
      const clientResult = await tool.run({ query: 'test' }, ctx);
      expect(clientResult).toEqual({ client: 'test' });

      // Test caching
      ctx.cache.set('cached', { cached: true });
      const cachedResult = await tool.run({ query: 'cached' }, ctx);
      expect(cachedResult).toEqual({ cached: true });
    });
  });

  describe('Tool Registry', () => {
    it('should register and retrieve tools', () => {
      const tool = aui
        .tool('test')
        .execute(() => 'result');

      const retrieved = aui.get('test');
      expect(retrieved).toBe(tool);
    });

    it('should list all tools', () => {
      aui.tool('tool1').execute(() => 1);
      aui.tool('tool2').execute(() => 2);

      const names = aui.getToolNames();
      expect(names).toContain('tool1');
      expect(names).toContain('tool2');
    });

    it('should execute tools by name', async () => {
      aui
        .tool('calc')
        .input(z.object({ a: z.number(), b: z.number() }))
        .execute(({ input }) => input.a + input.b);

      const result = await aui.execute('calc', { a: 5, b: 3 });
      expect(result).toBe(8);
    });
  });

  describe('Input Validation', () => {
    it('should validate input with Zod', async () => {
      const tool = aui
        .tool('validated')
        .input(z.object({
          email: z.string().email(),
          age: z.number().min(0)
        }))
        .execute(({ input }) => input);

      // Valid input
      const valid = await tool.run({ email: 'test@example.com', age: 25 });
      expect(valid).toEqual({ email: 'test@example.com', age: 25 });

      // Invalid input
      await expect(
        tool.run({ email: 'invalid', age: -1 })
      ).rejects.toThrow();
    });
  });

  describe('Helper Methods', () => {
    it('should create simple tools', () => {
      const tool = aui.simple(
        'greet',
        z.object({ name: z.string() }),
        ({ name }) => `Hello, ${name}!`
      );

      expect(tool.name).toBe('greet');
    });

    it('should define multiple tools', () => {
      const tools = aui.defineTools({
        add: {
          input: z.object({ a: z.number(), b: z.number() }),
          execute: ({ a, b }) => a + b
        },
        multiply: {
          input: z.object({ x: z.number(), y: z.number() }),
          execute: ({ x, y }) => x * y
        }
      });

      expect(tools.add.name).toBe('add');
      expect(tools.multiply.name).toBe('multiply');
    });

    it('should create AI-optimized tools', async () => {
      const tools = aui.aiTools({
        api: {
          input: z.object({ endpoint: z.string() }),
          execute: async ({ endpoint }) => ({ data: endpoint }),
          retry: 2,
          cache: true
        }
      });

      expect(tools.api.name).toBe('api');
    });
  });

  describe('Context Management', () => {
    it('should create context with defaults', () => {
      const ctx = aui.createContext();
      
      expect(ctx.cache).toBeDefined();
      expect(ctx.fetch).toBeDefined();
    });

    it('should merge context additions', () => {
      const ctx = aui.createContext({
        user: { id: 1, name: 'Test' }
      });
      
      expect(ctx.user).toEqual({ id: 1, name: 'Test' });
      expect(ctx.cache).toBeDefined();
    });
  });
});