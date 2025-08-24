import aui, { Tool } from '@/lib/aui/lantos-concise';
import { z } from 'zod';

describe('Lantos AUI Concise API', () => {
  beforeEach(() => {
    aui.register.clear();
  });

  describe('Tool Creation', () => {
    it('should create a simple tool with just execute and render', () => {
      const tool = aui
        .tool('simple')
        .execute(async () => ({ message: 'Hello' }))
        .render(({ data }) => `Message: ${data.message}`);

      expect(tool).toBeInstanceOf(Tool);
      expect(tool.definition.name).toBe('simple');
    });

    it('should create a tool with input validation', () => {
      const tool = aui
        .tool('validated')
        .input(z.object({ name: z.string() }))
        .execute(async ({ input }) => ({ greeting: `Hello ${input.name}` }));

      expect(tool.definition.input).toBeDefined();
    });

    it('should create a complex tool with client execution', () => {
      const tool = aui
        .tool('complex')
        .input(z.object({ id: z.string() }))
        .execute(async ({ input }) => ({ server: input.id }))
        .clientExecute(async ({ input, ctx }) => ({ client: input.id }));

      expect(tool.definition.clientExecute).toBeDefined();
      expect(tool.definition.execute).toBeDefined();
    });
  });

  describe('Tool Execution', () => {
    it('should execute a simple tool', async () => {
      const tool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }));

      const result = await tool.run({ city: 'SF' });
      expect(result).toEqual({ temp: 72, city: 'SF' });
    });

    it('should validate input with zod schema', async () => {
      const tool = aui
        .tool('strict')
        .input(z.object({ 
          age: z.number().min(0).max(150) 
        }))
        .execute(async ({ input }) => ({ valid: true, age: input.age }));

      await expect(tool.run({ age: -1 })).rejects.toThrow();
      await expect(tool.run({ age: 200 })).rejects.toThrow();
      
      const result = await tool.run({ age: 25 });
      expect(result.age).toBe(25);
    });

    it('should use client execution when in browser environment', async () => {
      // Mock browser environment
      const originalWindow = global.window;
      global.window = {} as any;

      const tool = aui
        .tool('dual')
        .execute(async () => ({ source: 'server' }))
        .clientExecute(async () => ({ source: 'client' }));

      const result = await tool.run({});
      expect(result.source).toBe('client');

      // Restore
      global.window = originalWindow;
    });

    it('should use server execution in Node environment', async () => {
      const tool = aui
        .tool('dual')
        .execute(async () => ({ source: 'server' }))
        .clientExecute(async () => ({ source: 'client' }));

      const result = await tool.run({});
      expect(result.source).toBe('server');
    });
  });

  describe('Tool Context', () => {
    it('should pass context to execute function', async () => {
      const tool = aui
        .tool('contextual')
        .execute(async ({ ctx }) => ({ 
          hasCache: !!ctx?.cache,
          hasFetch: !!ctx?.fetch 
        }));

      const result = await tool.run({}, {
        cache: new Map(),
        fetch: global.fetch
      });

      expect(result.hasCache).toBe(true);
      expect(result.hasFetch).toBe(true);
    });

    it('should use cache from context', async () => {
      const cache = new Map();
      cache.set('test', { cached: true });

      const tool = aui
        .tool('cached')
        .input(z.object({ key: z.string() }))
        .clientExecute(async ({ input, ctx }) => {
          return ctx.cache.get(input.key) || { cached: false };
        });

      // Mock browser
      global.window = {} as any;

      const result = await tool.run({ key: 'test' }, { cache, fetch });
      expect(result).toEqual({ cached: true });

      const result2 = await tool.run({ key: 'missing' }, { cache, fetch });
      expect(result2).toEqual({ cached: false });

      // Cleanup
      delete global.window;
    });
  });

  describe('Tool Registry', () => {
    it('should register and retrieve tools', () => {
      const tool = aui.tool('registered').execute(async () => ({}));
      
      aui.set(tool);
      const retrieved = aui.get('registered');
      
      expect(retrieved).toBe(tool);
    });

    it('should handle multiple tool registrations', () => {
      const tool1 = aui.tool('tool1').execute(async () => ({}));
      const tool2 = aui.tool('tool2').execute(async () => ({}));
      
      aui.set(tool1);
      aui.set(tool2);
      
      expect(aui.register.size).toBe(2);
      expect(aui.get('tool1')).toBe(tool1);
      expect(aui.get('tool2')).toBe(tool2);
    });
  });

  describe('Real-world Examples', () => {
    it('should handle weather tool pattern', async () => {
      const weatherTool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }))
        .render(({ data }) => `${data.city}: ${data.temp}°`);

      const result = await weatherTool.run({ city: 'San Francisco' });
      expect(result).toEqual({ temp: 72, city: 'San Francisco' });
      
      const rendered = weatherTool.definition.render?.({ data: result });
      expect(rendered).toBe('San Francisco: 72°');
    });

    it('should handle search tool with caching', async () => {
      const cache = new Map();
      
      const searchTool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ 
          results: [`Server: ${input.query}`] 
        }))
        .clientExecute(async ({ input, ctx }) => {
          const cacheKey = input.query;
          const cached = ctx.cache.get(cacheKey);
          if (cached) return cached;
          
          const result = { results: [`Client: ${input.query}`] };
          ctx.cache.set(cacheKey, result);
          return result;
        });

      // Mock browser
      global.window = {} as any;

      // First call - should execute and cache
      const result1 = await searchTool.run(
        { query: 'test' }, 
        { cache, fetch }
      );
      expect(result1.results[0]).toBe('Client: test');
      expect(cache.has('test')).toBe(true);

      // Second call - should use cache
      const result2 = await searchTool.run(
        { query: 'test' }, 
        { cache, fetch }
      );
      expect(result2).toBe(result1); // Same reference from cache

      // Cleanup
      delete global.window;
    });
  });
});