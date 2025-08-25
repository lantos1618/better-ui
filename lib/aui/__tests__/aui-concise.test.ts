import { describe, it, expect, beforeEach } from '@jest/globals';
import aui, { AUITool, z } from '../index';

describe('AUI Concise API', () => {
  beforeEach(() => {
    aui.clear();
  });

  describe('Simple Tools', () => {
    it('should create a simple tool with just input and execute', async () => {
      const weatherTool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }));

      const result = await weatherTool.run({ city: 'SF' });
      expect(result).toEqual({ temp: 72, city: 'SF' });
    });

    it('should work without input schema', async () => {
      const simpleTool = aui
        .tool('simple')
        .execute(async () => ({ success: true }));

      const result = await simpleTool.run({});
      expect(result).toEqual({ success: true });
    });

    it('should support render method', () => {
      const tool = aui
        .tool('ui')
        .input(z.object({ text: z.string() }))
        .execute(async ({ input }) => ({ message: input.text }))
        .render(({ data }) => ({ type: 'div', props: { children: data.message } } as any));

      expect(tool.renderer).toBeDefined();
    });
  });

  describe('Complex Tools with Client Execution', () => {
    it('should use client execution when available and not on server', async () => {
      const searchTool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ server: true, query: input.query }))
        .clientExecute(async ({ input }) => ({ server: true, query: input.query }));

      const clientContext = { 
        cache: new Map(), 
        fetch: global.fetch,
        isServer: false 
      };

      const result = await searchTool.run({ query: 'test' }, clientContext);
      expect(result).toEqual({ server: true, query: 'test' });
    });

    it('should use server execution when on server', async () => {
      const searchTool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ server: true, query: input.query }))
        .clientExecute(async ({ input }) => ({ server: false, query: input.query }));

      const serverContext = { 
        cache: new Map(), 
        fetch: global.fetch,
        isServer: true 
      };

      const result = await searchTool.run({ query: 'test' }, serverContext);
      expect(result).toEqual({ server: true, query: 'test' });
    });

    it('should support caching in client execution', async () => {
      const cache = new Map();
      let fetchCalls = 0;

      const cachedTool = aui
        .tool('cached')
        .input(z.object({ key: z.string() }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.key);
          if (cached) return cached;
          
          fetchCalls++;
          const data = { value: `fetched-${input.key}`, calls: fetchCalls };
          ctx.cache.set(input.key, data);
          return data;
        });

      const context = { cache, fetch: global.fetch, isServer: false };

      const result1 = await cachedTool.run({ key: 'test' }, context);
      const result2 = await cachedTool.run({ key: 'test' }, context);

      expect(result1).toEqual({ value: 'fetched-test', calls: 1 });
      expect(result2).toEqual({ value: 'fetched-test', calls: 1 });
      expect(fetchCalls).toBe(1);
    });
  });

  describe('AI Control Tools', () => {
    it('should create DOM control tool', async () => {
      const domTool = aui
        .tool('dom')
        .input(z.object({
          action: z.enum(['click', 'type', 'scroll']),
          selector: z.string(),
          value: z.string().optional()
        }))
        .clientExecute(async ({ input }) => {
          return { success: true, action: input.action };
        });

      const result = await domTool.run(
        { action: 'click', selector: '#button' },
        { cache: new Map(), fetch: global.fetch, isServer: false }
      );

      expect(result).toEqual({ success: true, action: 'click' });
    });

    it('should create database control tool', async () => {
      const dbTool = aui
        .tool('database')
        .input(z.object({
          operation: z.enum(['find', 'create', 'update', 'delete']),
          collection: z.string(),
          data: z.any().optional()
        }))
        .execute(async ({ input }) => {
          return { 
            operation: input.operation, 
            collection: input.collection,
            result: 'mock-data' 
          };
        });

      const result = await dbTool.run({
        operation: 'find',
        collection: 'users'
      });

      expect(result).toEqual({
        operation: 'find',
        collection: 'users',
        result: 'mock-data'
      });
    });
  });

  describe('Tool Middleware', () => {
    it('should support middleware', async () => {
      const events: string[] = [];

      const toolWithMiddleware = aui
        .tool('middleware-test')
        .input(z.object({ value: z.number() }))
        .middleware(async ({ input, next }) => {
          events.push('middleware-1-before');
          input.value = input.value * 2;
          const result = await next();
          events.push('middleware-1-after');
          return result;
        })
        .middleware(async ({ input, next }) => {
          events.push('middleware-2-before');
          input.value = input.value + 1;
          const result = await next();
          events.push('middleware-2-after');
          return result;
        })
        .execute(async ({ input }) => {
          events.push('execute');
          return { finalValue: input.value };
        });

      const result = await toolWithMiddleware.run({ value: 5 });

      expect(result).toEqual({ finalValue: 11 }); // (5 * 2) + 1
      expect(events).toEqual([
        'middleware-1-before',
        'middleware-2-before',
        'execute',
        'middleware-2-after',
        'middleware-1-after'
      ]);
    });
  });

  describe('Tool Registry', () => {
    it('should register and retrieve tools', () => {
      const tool1 = aui.tool('tool1').execute(async () => ({ id: 1 }));
      const tool2 = aui.tool('tool2').execute(async () => ({ id: 2 }));

      expect(aui.has('tool1')).toBe(true);
      expect(aui.has('tool2')).toBe(true);
      expect(aui.getToolNames()).toContain('tool1');
      expect(aui.getToolNames()).toContain('tool2');
    });

    it('should execute tools by name', async () => {
      aui.tool('named')
        .input(z.object({ value: z.string() }))
        .execute(async ({ input }) => ({ result: input.value }));

      const result = await aui.execute('named', { value: 'test' });
      expect(result).toEqual({ result: 'test' });
    });
  });

  describe('Type Safety', () => {
    it('should validate input with Zod schema', async () => {
      const strictTool = aui
        .tool('strict')
        .input(z.object({ 
          name: z.string().min(1),
          age: z.number().positive()
        }))
        .execute(async ({ input }) => input);

      await expect(
        strictTool.run({ name: '', age: 25 })
      ).rejects.toThrow();

      await expect(
        strictTool.run({ name: 'John', age: -5 })
      ).rejects.toThrow();

      const validResult = await strictTool.run({ name: 'John', age: 25 });
      expect(validResult).toEqual({ name: 'John', age: 25 });
    });
  });

  describe('Tool Composition', () => {
    it('should support workflow tools that compose other tools', async () => {
      aui.tool('add')
        .input(z.object({ a: z.number(), b: z.number() }))
        .execute(async ({ input }) => ({ sum: input.a + input.b }));

      aui.tool('multiply')
        .input(z.object({ a: z.number(), b: z.number() }))
        .execute(async ({ input }) => ({ product: input.a * input.b }));

      const workflowTool = aui
        .tool('workflow')
        .input(z.object({
          steps: z.array(z.object({
            tool: z.string(),
            input: z.any()
          }))
        }))
        .execute(async ({ input }) => {
          const results = [];
          for (const step of input.steps) {
            const result = await aui.execute(step.tool, step.input);
            results.push(result);
          }
          return { results };
        });

      const result = await workflowTool.run({
        steps: [
          { tool: 'add', input: { a: 2, b: 3 } },
          { tool: 'multiply', input: { a: 4, b: 5 } }
        ]
      });

      expect(result).toEqual({
        results: [
          { sum: 5 },
          { product: 20 }
        ]
      });
    });
  });
});