import aui from '../lantos/index';
import { z } from 'zod';
import React from 'react';

describe('Lantos AUI API', () => {
  beforeEach(() => {
    // Clear registry between tests
    aui.clear();
  });

  describe('Simple Tool Pattern', () => {
    it('should create a simple tool with just execute and render', () => {
      const tool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }))
        .render(({ data }) => React.createElement('div', {}, `${data.city}: ${data.temp}°`));

      expect(tool.name).toBe('weather');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
      expect(tool.render).toBeDefined();
    });

    it('should execute simple tool correctly', async () => {
      const tool = aui
        .tool('test')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ doubled: input.value * 2 }));

      const result = await tool.execute({ input: { value: 5 } });
      expect(result).toEqual({ doubled: 10 });
    });

    it('should work without render method', async () => {
      const tool = aui
        .tool('minimal')
        .input(z.object({ x: z.number() }))
        .execute(async ({ input }) => ({ result: input.x * 3 }));

      const result = await tool.execute({ input: { x: 4 } });
      expect(result).toEqual({ result: 12 });
    });
  });

  describe('Complex Tool Pattern', () => {
    it('should create tool with client optimization', async () => {
      const mockCache = new Map();
      
      const tool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ results: [`server: ${input.query}`] }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.query);
          if (cached) return cached;
          
          const result = { results: [`client: ${input.query}`] };
          ctx.cache.set(input.query, result);
          return result;
        });

      expect(tool.clientExecute).toBeDefined();
      
      // Test client execution
      const ctx = {
        cache: mockCache,
        fetch: async () => ({ results: ['fetched'] })
      };
      
      const result = await tool.clientExecute!({ input: { query: 'test' }, ctx });
      expect(result).toEqual({ results: ['client: test'] });
      
      // Test cache hit
      const cachedResult = await tool.clientExecute!({ input: { query: 'test' }, ctx });
      expect(cachedResult).toEqual({ results: ['client: test'] });
      expect(mockCache.get('test')).toBeDefined();
    });
  });

  describe('Tool Registry', () => {
    it('should register tools automatically', () => {
      const tool1 = aui.tool('tool1').input(z.object({ a: z.string() }));
      const tool2 = aui.tool('tool2').input(z.object({ b: z.number() }));

      expect(aui.get('tool1')).toBe(tool1);
      expect(aui.get('tool2')).toBe(tool2);
      expect(aui.list()).toHaveLength(2);
    });

    it('should clear registry', () => {
      aui.tool('test1');
      aui.tool('test2');
      expect(aui.list()).toHaveLength(2);
      
      aui.clear();
      expect(aui.list()).toHaveLength(0);
    });
  });

  describe('Type Inference', () => {
    it('should properly infer types through the chain', async () => {
      const tool = aui
        .tool('typed')
        .input(z.object({ 
          str: z.string(),
          num: z.number() 
        }))
        .execute(async ({ input }) => ({
          combined: `${input.str}-${input.num}`,
          double: input.num * 2
        }));

      // TypeScript should infer these types correctly
      type Input = z.infer<typeof tool.inputSchema>;
      type Output = Awaited<ReturnType<typeof tool.execute>>;
      
      // Test execution with proper types
      const result = await tool.execute({ 
        input: { str: 'test', num: 42 } 
      });
      
      expect(result.combined).toBe('test-42');
      expect(result.double).toBe(84);
    });
  });

  describe('Chaining Pattern', () => {
    it('should allow method chaining in any order', () => {
      // Input -> Execute -> Render
      const tool1 = aui
        .tool('chain1')
        .input(z.object({ x: z.number() }))
        .execute(async ({ input }) => ({ y: input.x }))
        .render(({ data }) => React.createElement('span', {}, data.y));

      // Execute -> Input -> Render (should still work)
      const tool2 = aui
        .tool('chain2')
        .execute(async ({ input }) => ({ y: (input as any).x }))
        .input(z.object({ x: z.number() }))
        .render(({ data }) => React.createElement('span', {}, data.y));

      expect(tool1.name).toBe('chain1');
      expect(tool2.name).toBe('chain2');
      expect(tool1.inputSchema).toBeDefined();
      expect(tool2.inputSchema).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const tool = aui
        .tool('validated')
        .input(z.object({ 
          email: z.string().email(),
          age: z.number().min(0).max(120) 
        }))
        .execute(async ({ input }) => ({ valid: true }));

      // Invalid input should throw
      await expect(
        tool.execute({ input: { email: 'not-an-email', age: 150 } })
      ).rejects.toThrow();
    });

    it('should handle execution errors', async () => {
      const tool = aui
        .tool('failing')
        .input(z.object({ fail: z.boolean() }))
        .execute(async ({ input }) => {
          if (input.fail) throw new Error('Intentional failure');
          return { success: true };
        });

      await expect(
        tool.execute({ input: { fail: true } })
      ).rejects.toThrow('Intentional failure');

      const result = await tool.execute({ input: { fail: false } });
      expect(result).toEqual({ success: true });
    });
  });

  describe('Context Usage', () => {
    it('should pass context to execute handlers', async () => {
      const tool = aui
        .tool('contextual')
        .input(z.object({ value: z.string() }))
        .execute(async ({ input, ctx }) => ({
          hasContext: ctx !== undefined,
          value: input.value
        }));

      const result = await tool.execute({ 
        input: { value: 'test' },
        ctx: { cache: new Map(), fetch: async () => null }
      });

      expect(result.hasContext).toBe(true);
      expect(result.value).toBe('test');
    });
  });
});