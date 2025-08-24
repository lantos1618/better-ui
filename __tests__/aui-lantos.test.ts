import { describe, it, expect, beforeEach } from '@jest/globals';
import { z } from 'zod';
import aui, { Tool, type ToolContext } from '@/lib/aui/lantos/index';

describe('AUI Lantos - Ultra-Concise API', () => {
  beforeEach(() => {
    aui.clear();
  });

  describe('Simple Tool Pattern', () => {
    it('should create a simple tool with just 2 methods', async () => {
      const tool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }));

      expect(tool.name).toBe('weather');
      
      const result = await tool.run({ city: 'SF' });
      expect(result).toEqual({ temp: 72, city: 'SF' });
    });

    it('should validate input schema', async () => {
      const tool = aui
        .tool('strict')
        .input(z.object({ 
          name: z.string().min(2),
          age: z.number().positive()
        }))
        .execute(({ input }) => `${input.name} is ${input.age}`);

      await expect(tool.run({ name: 'a', age: 25 })).rejects.toThrow();
      await expect(tool.run({ name: 'Alice', age: -5 })).rejects.toThrow();
      
      const result = await tool.run({ name: 'Alice', age: 25 });
      expect(result).toBe('Alice is 25');
    });
  });

  describe('Complex Tool with Client Execution', () => {
    it('should support client-side execution', async () => {
      const tool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({
          server: true,
          query: input.query,
          results: [`Server result for ${input.query}`]
        }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.query);
          if (cached) return cached;
          
          const result = {
            client: true,
            query: input.query,
            results: [`Client result for ${input.query}`]
          };
          ctx.cache.set(input.query, result);
          return result;
        });

      // Without context, should use server execution
      const serverResult = await tool.run({ query: 'test' });
      expect(serverResult.server).toBe(true);

      // With context, should use client execution
      const ctx: ToolContext = {
        cache: new Map(),
        fetch: async () => ({})
      };
      
      const clientResult = await tool.run({ query: 'test' }, ctx);
      expect(clientResult.client).toBe(true);
      
      // Second call should hit cache
      const cachedResult = await tool.run({ query: 'test' }, ctx);
      expect(cachedResult).toBe(clientResult);
    });
  });

  describe('Tool Registration and Retrieval', () => {
    it('should auto-register tools', () => {
      const tool = aui.tool('registered');
      expect(aui.has('registered')).toBe(true);
      expect(aui.get('registered')).toBe(tool);
    });

    it('should list all tools', () => {
      aui.tool('tool1');
      aui.tool('tool2');
      aui.tool('tool3');

      const tools = aui.list();
      expect(tools).toHaveLength(3);
      expect(tools.map(t => t.name)).toContain('tool1');
      expect(tools.map(t => t.name)).toContain('tool2');
      expect(tools.map(t => t.name)).toContain('tool3');
    });
  });

  describe('No Build Required', () => {
    it('should work without .build() method', async () => {
      // The tool is immediately usable after definition
      const tool = aui
        .tool('instant')
        .input(z.object({ msg: z.string() }))
        .execute(({ input }) => `Echo: ${input.msg}`);

      // No .build() call needed!
      const result = await tool.run({ msg: 'Hello' });
      expect(result).toBe('Echo: Hello');
    });
  });

  describe('TypeScript Type Inference', () => {
    it('should infer types correctly', async () => {
      const tool = aui
        .tool('typed')
        .input(z.object({ 
          count: z.number(),
          label: z.string()
        }))
        .execute(({ input }) => ({
          total: input.count * 2,
          description: `${input.label}: ${input.count}`
        }));

      const result = await tool.run({ count: 5, label: 'Items' });
      
      // TypeScript should know the shape of result
      expect(result.total).toBe(10);
      expect(result.description).toBe('Items: 5');
    });
  });

  describe('Async Execution', () => {
    it('should handle async operations', async () => {
      const tool = aui
        .tool('async')
        .input(z.object({ delay: z.number() }))
        .execute(async ({ input }) => {
          await new Promise(resolve => setTimeout(resolve, input.delay));
          return { completed: true, delay: input.delay };
        });

      const start = Date.now();
      const result = await tool.run({ delay: 50 });
      const elapsed = Date.now() - start;

      expect(result.completed).toBe(true);
      expect(elapsed).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Error Handling', () => {
    it('should handle execution errors', async () => {
      const tool = aui
        .tool('error')
        .execute(async () => {
          throw new Error('Execution failed');
        });

      await expect(tool.run(undefined)).rejects.toThrow('Execution failed');
    });

    it('should handle validation errors', async () => {
      const tool = aui
        .tool('validate')
        .input(z.object({ required: z.string() }))
        .execute(({ input }) => input.required);

      await expect(tool.run({ wrong: 'field' } as any)).rejects.toThrow();
    });
  });

  describe('Context Usage', () => {
    it('should provide context to execution', async () => {
      const tool = aui
        .tool('contextual')
        .input(z.object({ key: z.string() }))
        .execute(({ input, ctx }) => {
          if (!ctx) return { hasContext: false };
          
          return {
            hasContext: true,
            hasCache: !!ctx.cache,
            hasFetch: !!ctx.fetch,
            cacheSize: ctx.cache.size
          };
        });

      const ctx = aui.createContext();
      ctx.cache.set('test', 'value');
      
      const result = await tool.run({ key: 'test' }, ctx);
      expect(result.hasContext).toBe(true);
      expect(result.hasCache).toBe(true);
      expect(result.hasFetch).toBe(true);
      expect(result.cacheSize).toBe(1);
    });
  });

  describe('Tool Chaining', () => {
    it('should support method chaining', () => {
      const tool = aui
        .tool('chained')
        .input(z.object({ value: z.number() }))
        .execute(({ input }) => input.value * 2)
        .clientExecute(({ input }) => input.value * 3);

      expect(tool.name).toBe('chained');
      expect(tool).toBeInstanceOf(Tool);
    });
  });
});