import aui from '../index';
import { z } from 'zod';

describe('AUI Comprehensive Tests', () => {
  beforeEach(() => {
    aui.clear();
  });

  describe('Core AUI Functionality', () => {
    it('should create a simple tool with execute and render', async () => {
      const tool = aui
        .tool('test-tool')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ result: input.value * 2 }));

      expect(tool.name).toBe('test-tool');
      
      const result = await tool.run({ value: 5 });
      expect(result).toEqual({ result: 10 });
    });

    it('should handle client execution when not on server', async () => {
      const clientFn = jest.fn(async ({ input }) => ({ server: false, client: true, value: input.value }));
      const serverFn = jest.fn(async ({ input }) => ({ server: true, value: input.value }));

      const tool = aui
        .tool('dual-tool')
        .input(z.object({ value: z.string() }))
        .execute(serverFn)
        .clientExecute(clientFn);

      // Simulate client environment
      const result = await tool.run(
        { value: 'test' },
        { 
          isServer: false, 
          cache: new Map(), 
          fetch: global.fetch 
        }
      );

      expect(result).toEqual({ server: false, client: true, value: 'test' });
      expect(clientFn).toHaveBeenCalled();
      expect(serverFn).not.toHaveBeenCalled();
    });

    it('should use server execution when on server', async () => {
      const clientFn = jest.fn(async ({ input }) => ({ server: false, client: true }));
      const serverFn = jest.fn(async ({ input }) => ({ server: true }));

      const tool = aui
        .tool('server-tool')
        .execute(serverFn)
        .clientExecute(clientFn);

      const result = await tool.run(
        {},
        { 
          isServer: true, 
          cache: new Map(), 
          fetch: global.fetch 
        }
      );

      expect(result).toEqual({ server: true });
      expect(serverFn).toHaveBeenCalled();
      expect(clientFn).not.toHaveBeenCalled();
    });

    it('should validate input with Zod schema', async () => {
      const tool = aui
        .tool('validated-tool')
        .input(z.object({ 
          name: z.string().min(3),
          age: z.number().positive()
        }))
        .execute(async ({ input }) => input);

      await expect(tool.run({ name: 'ab', age: 25 }))
        .rejects.toThrow();

      await expect(tool.run({ name: 'Alice', age: -5 }))
        .rejects.toThrow();

      const result = await tool.run({ name: 'Alice', age: 25 });
      expect(result).toEqual({ name: 'Alice', age: 25 });
    });

    it('should support middleware', async () => {
      const middleware1 = jest.fn(async ({ input, next }) => {
        const result = await next();
        return { ...result, middleware1: true };
      });

      const middleware2 = jest.fn(async ({ input, next }) => {
        const result = await next();
        return { ...result, middleware2: true };
      });

      const tool = aui
        .tool('middleware-tool')
        .execute(async () => ({ base: true }))
        .middleware(middleware1)
        .middleware(middleware2);

      const result = await tool.run({});
      
      expect(result).toEqual({
        base: true,
        middleware1: true,
        middleware2: true
      });
      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).toHaveBeenCalled();
    });

    it('should support tags and descriptions', () => {
      const tool = aui
        .tool('tagged-tool')
        .describe('A tool with tags')
        .tag('ai', 'control', 'frontend');

      expect(tool.description).toBe('A tool with tags');
      expect(tool.tags).toEqual(['ai', 'control', 'frontend']);
    });
  });

  describe('AUI Instance Management', () => {
    it('should store and retrieve tools', () => {
      const tool1 = aui.tool('tool1');
      const tool2 = aui.tool('tool2');

      expect(aui.has('tool1')).toBe(true);
      expect(aui.has('tool2')).toBe(true);
      expect(aui.has('tool3')).toBe(false);

      expect(aui.get('tool1')).toBe(tool1);
      expect(aui.get('tool2')).toBe(tool2);
      expect(aui.get('tool3')).toBeUndefined();
    });

    it('should list all tools', () => {
      aui.tool('a').tag('type1');
      aui.tool('b').tag('type2');
      aui.tool('c').tag('type1', 'type2');

      const tools = aui.list();
      expect(tools).toHaveLength(3);
      expect(tools.map(t => t.name)).toEqual(['a', 'b', 'c']);
    });

    it('should find tools by tags', () => {
      aui.tool('frontend').tag('ui', 'client');
      aui.tool('backend').tag('api', 'server');
      aui.tool('fullstack').tag('ui', 'api');

      const uiTools = aui.findByTag('ui');
      expect(uiTools).toHaveLength(2);
      expect(uiTools.map(t => t.name)).toContain('frontend');
      expect(uiTools.map(t => t.name)).toContain('fullstack');

      const apiTools = aui.findByTags('ui', 'api');
      expect(apiTools).toHaveLength(1);
      expect(apiTools[0].name).toBe('fullstack');
    });

    it('should execute tools by name', async () => {
      aui
        .tool('calculator')
        .input(z.object({ a: z.number(), b: z.number() }))
        .execute(async ({ input }) => ({ sum: input.a + input.b }));

      const result = await aui.execute('calculator', { a: 3, b: 4 });
      expect(result).toEqual({ sum: 7 });

      await expect(aui.execute('nonexistent', {}))
        .rejects.toThrow('Tool "nonexistent" not found');
    });

    it('should remove tools', () => {
      aui.tool('temp');
      expect(aui.has('temp')).toBe(true);
      
      const removed = aui.remove('temp');
      expect(removed).toBe(true);
      expect(aui.has('temp')).toBe(false);
      
      const removedAgain = aui.remove('temp');
      expect(removedAgain).toBe(false);
    });

    it('should clear all tools', () => {
      aui.tool('t1');
      aui.tool('t2');
      aui.tool('t3');
      
      expect(aui.list()).toHaveLength(3);
      
      aui.clear();
      expect(aui.list()).toHaveLength(0);
    });
  });

  describe('Context Management', () => {
    it('should create default context', () => {
      const ctx = aui.createContext();
      
      expect(ctx.cache).toBeInstanceOf(Map);
      expect(ctx.fetch).toBeDefined();
      expect(ctx.isServer).toBe(true); // In test environment
    });

    it('should merge context additions', () => {
      const ctx = aui.createContext({
        user: { id: 1, name: 'Test' },
        session: { token: 'abc123' },
        env: { API_KEY: 'secret' }
      });
      
      expect(ctx.user).toEqual({ id: 1, name: 'Test' });
      expect(ctx.session).toEqual({ token: 'abc123' });
      expect(ctx.env).toEqual({ API_KEY: 'secret' });
      expect(ctx.cache).toBeInstanceOf(Map);
    });

    it('should use context cache in client execution', async () => {
      const fetchMock = jest.fn(async () => ({ data: 'fresh' }));
      
      const tool = aui
        .tool('cached-tool')
        .input(z.object({ key: z.string() }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.key);
          if (cached) return cached;
          
          const result = await fetchMock();
          ctx.cache.set(input.key, result);
          return result;
        });

      const ctx = {
        cache: new Map(),
        fetch: global.fetch,
        isServer: false
      };

      // First call - should fetch
      const result1 = await tool.run({ key: 'test' }, ctx);
      expect(result1).toEqual({ data: 'fresh' });
      expect(fetchMock).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const result2 = await tool.run({ key: 'test' }, ctx);
      expect(result2).toEqual({ data: 'fresh' });
      expect(fetchMock).toHaveBeenCalledTimes(1); // Still 1, not called again
    });
  });

  describe('Tool Configuration', () => {
    it('should return tool configuration', () => {
      const tool = aui
        .tool('config-tool')
        .input(z.object({ value: z.string() }))
        .execute(async ({ input }) => input)
        .describe('A configurable tool')
        .tag('test', 'config');

      const config = tool.getConfig();
      
      expect(config.name).toBe('config-tool');
      expect(config.description).toBe('A configurable tool');
      expect(config.tags).toEqual(['test', 'config']);
      expect(config.inputSchema).toBeDefined();
      expect(config.executeHandler).toBeDefined();
    });

    it('should serialize tool to JSON', () => {
      const tool = aui
        .tool('json-tool')
        .input(z.object({ id: z.number() }))
        .execute(async () => ({}))
        .clientExecute(async () => ({}))
        .middleware(async ({ next }) => next())
        .describe('JSON serializable tool')
        .tag('json');

      const json = tool.toJSON();
      
      expect(json).toEqual({
        name: 'json-tool',
        description: 'JSON serializable tool',
        tags: ['json'],
        hasInput: true,
        hasExecute: true,
        hasClientExecute: true,
        hasRender: false,
        hasMiddleware: true
      });
    });
  });

  describe('Complex Tool Scenarios', () => {
    it('should handle async operations correctly', async () => {
      const delays = [100, 50, 150];
      const results: number[] = [];

      const tool = aui
        .tool('async-tool')
        .input(z.object({ delay: z.number(), value: z.number() }))
        .execute(async ({ input }) => {
          await new Promise(resolve => setTimeout(resolve, input.delay));
          results.push(input.value);
          return { processed: input.value };
        });

      // Execute in parallel
      const promises = delays.map((delay, i) => 
        tool.run({ delay, value: i })
      );

      const responses = await Promise.all(promises);
      
      // Results should be in order of completion (50ms, 100ms, 150ms)
      expect(results).toEqual([1, 0, 2]);
      expect(responses).toEqual([
        { processed: 0 },
        { processed: 1 },
        { processed: 2 }
      ]);
    });

    it('should handle errors gracefully', async () => {
      const tool = aui
        .tool('error-tool')
        .input(z.object({ shouldFail: z.boolean() }))
        .execute(async ({ input }) => {
          if (input.shouldFail) {
            throw new Error('Intentional failure');
          }
          return { success: true };
        });

      const success = await tool.run({ shouldFail: false });
      expect(success).toEqual({ success: true });

      await expect(tool.run({ shouldFail: true }))
        .rejects.toThrow('Intentional failure');
    });

    it('should chain multiple tools together', async () => {
      const preprocessor = aui
        .tool('preprocessor')
        .input(z.object({ text: z.string() }))
        .execute(async ({ input }) => ({ 
          processed: input.text.toUpperCase() 
        }));

      const analyzer = aui
        .tool('analyzer')
        .input(z.object({ processed: z.string() }))
        .execute(async ({ input }) => ({ 
          length: input.processed.length,
          words: input.processed.split(' ').length 
        }));

      const input = { text: 'hello world' };
      const preprocessed = await preprocessor.run(input);
      const analyzed = await analyzer.run(preprocessed);

      expect(analyzed).toEqual({
        length: 11,
        words: 2
      });
    });
  });
});