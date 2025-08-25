import { describe, it, expect, beforeEach } from '@jest/globals';
import aui, { AUI, z } from '../index';

describe('AUI Core System', () => {
  let testAUI: AUI;

  beforeEach(() => {
    testAUI = new AUI();
  });

  describe('Simple Tool Pattern', () => {
    it('should create a simple tool with just execute and render', () => {
      const weatherTool = testAUI
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }));

      expect(weatherTool.name).toBe('weather');
      expect(weatherTool.schema).toBeDefined();
    });

    it('should execute simple tool correctly', async () => {
      const weatherTool = testAUI
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }));

      const result = await weatherTool.run({ city: 'San Francisco' });
      expect(result).toEqual({ temp: 72, city: 'San Francisco' });
    });

    it('should validate input with zod schema', async () => {
      const tool = testAUI
        .tool('validated')
        .input(z.object({ 
          email: z.string().email(),
          age: z.number().min(18)
        }))
        .execute(async ({ input }) => ({ valid: true, ...input }));

      await expect(tool.run({ email: 'invalid', age: 17 }))
        .rejects.toThrow();
      
      const result = await tool.run({ email: 'test@example.com', age: 25 });
      expect(result).toEqual({ valid: true, email: 'test@example.com', age: 25 });
    });
  });

  describe('Complex Tool Pattern', () => {
    it('should create tool with client execution', () => {
      const searchTool = testAUI
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => [{ id: 1, title: input.query }])
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.query);
          return cached || [{ id: 2, title: `Client: ${input.query}` }];
        });

      expect(searchTool.name).toBe('search');
      const config = searchTool.getConfig();
      expect(config.clientHandler).toBeDefined();
    });

    it('should use client handler when not on server', async () => {
      const tool = testAUI
        .tool('hybrid')
        .input(z.object({ value: z.string() }))
        .execute(async ({ input }) => ({ source: 'server', value: input.value }))
        .clientExecute(async ({ input }) => ({ source: 'client', value: input.value }));

      // Test with client context
      const clientResult = await tool.run(
        { value: 'test' }, 
        { cache: new Map(), fetch, isServer: false }
      );
      expect(clientResult).toEqual({ source: 'client', value: 'test' });

      // Test with server context
      const serverResult = await tool.run(
        { value: 'test' },
        { cache: new Map(), fetch, isServer: true }
      );
      expect(serverResult).toEqual({ source: 'server', value: 'test' });
    });

    it('should use cache in client execution', async () => {
      const cache = new Map();
      cache.set('cached-query', [{ id: 99, title: 'Cached Result' }]);

      const tool = testAUI
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => [{ id: 1, title: input.query }])
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.query);
          if (cached) return cached;
          return [{ id: 2, title: `Fresh: ${input.query}` }];
        });

      const result = await tool.run(
        { query: 'cached-query' },
        { cache, fetch, isServer: false }
      );
      
      expect(result).toEqual([{ id: 99, title: 'Cached Result' }]);
    });
  });

  describe('Middleware Support', () => {
    it('should apply middleware in order', async () => {
      const logs: string[] = [];
      
      const tool = testAUI
        .tool('middleware-test')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ result: input.value * 2 }))
        .middleware(async ({ input, next }) => {
          logs.push('middleware-1-before');
          const result = await next();
          logs.push('middleware-1-after');
          return { ...result, middleware1: true };
        })
        .middleware(async ({ input, next }) => {
          logs.push('middleware-2-before');
          const result = await next();
          logs.push('middleware-2-after');
          return { ...result, middleware2: true };
        });

      const result = await tool.run({ value: 5 });
      
      expect(logs).toEqual([
        'middleware-1-before',
        'middleware-2-before',
        'middleware-2-after',
        'middleware-1-after'
      ]);
      
      expect(result).toEqual({
        result: 10,
        middleware1: true,
        middleware2: true
      });
    });
  });

  describe('Tool Management', () => {
    it('should register and retrieve tools', () => {
      const tool1 = testAUI.tool('tool1').execute(async () => 'result1');
      const tool2 = testAUI.tool('tool2').execute(async () => 'result2');

      expect(testAUI.has('tool1')).toBe(true);
      expect(testAUI.has('tool2')).toBe(true);
      expect(testAUI.get('tool1')).toBe(tool1);
      expect(testAUI.get('tool2')).toBe(tool2);
    });

    it('should list all tools', () => {
      testAUI.tool('a').execute(async () => 'a');
      testAUI.tool('b').execute(async () => 'b');
      testAUI.tool('c').execute(async () => 'c');

      const tools = testAUI.list();
      expect(tools).toHaveLength(3);
      expect(testAUI.getToolNames()).toEqual(['a', 'b', 'c']);
    });

    it('should execute tool by name', async () => {
      testAUI
        .tool('calculator')
        .input(z.object({ a: z.number(), b: z.number() }))
        .execute(async ({ input }) => input.a + input.b);

      const result = await testAUI.execute('calculator', { a: 5, b: 3 });
      expect(result).toBe(8);
    });

    it('should find tools by tags', () => {
      testAUI.tool('t1').tag('ai', 'search').execute(async () => 't1');
      testAUI.tool('t2').tag('ai', 'database').execute(async () => 't2');
      testAUI.tool('t3').tag('search').execute(async () => 't3');

      const aiTools = testAUI.findByTag('ai');
      expect(aiTools).toHaveLength(2);

      const searchTools = testAUI.findByTag('search');
      expect(searchTools).toHaveLength(2);

      const aiSearchTools = testAUI.findByTags('ai', 'search');
      expect(aiSearchTools).toHaveLength(1);
      expect(aiSearchTools[0].name).toBe('t1');
    });
  });

  describe('Tool Metadata', () => {
    it('should support descriptions', () => {
      const tool = testAUI
        .tool('described')
        .describe('This tool does something important')
        .execute(async () => 'result');

      expect(tool.description).toBe('This tool does something important');
    });

    it('should serialize to JSON', () => {
      const tool = testAUI
        .tool('serializable')
        .describe('Test tool')
        .tag('test', 'example')
        .input(z.object({ x: z.number() }))
        .execute(async ({ input }) => input.x * 2)
        .clientExecute(async ({ input }) => input.x * 3)
        .middleware(async ({ next }) => next());

      const json = tool.toJSON();
      expect(json).toEqual({
        name: 'serializable',
        description: 'Test tool',
        tags: ['test', 'example'],
        hasInput: true,
        hasExecute: true,
        hasClientExecute: true,
        hasRender: false,
        hasMiddleware: true
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error for tool without execute handler', async () => {
      const tool = testAUI
        .tool('incomplete')
        .input(z.object({ x: z.number() }));

      await expect(tool.run({ x: 5 }))
        .rejects.toThrow('Tool incomplete has no execute handler');
    });

    it('should throw error for unknown tool', async () => {
      await expect(testAUI.execute('nonexistent', {}))
        .rejects.toThrow('Tool "nonexistent" not found');
    });
  });

  describe('Context Creation', () => {
    it('should create default context', () => {
      const ctx = testAUI.createContext();
      expect(ctx.cache).toBeInstanceOf(Map);
      expect(ctx.fetch).toBeDefined();
      expect(typeof ctx.isServer).toBe('boolean');
    });

    it('should merge additional context', () => {
      const ctx = testAUI.createContext({
        user: { id: 1, name: 'Test User' },
        session: { token: 'abc123' }
      });
      
      expect(ctx.user).toEqual({ id: 1, name: 'Test User' });
      expect(ctx.session).toEqual({ token: 'abc123' });
      expect(ctx.cache).toBeInstanceOf(Map);
    });
  });
});