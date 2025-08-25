import aui from '../index';
import { z } from 'zod';

describe('AUI Concise API Tests', () => {
  beforeEach(() => {
    aui.clear();
  });

  describe('Simple Tool Pattern', () => {
    it('should create tool with just 2 methods (input + execute)', async () => {
      const simpleTool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }));

      const result = await simpleTool.run({ city: 'SF' });
      expect(result).toEqual({ temp: 72, city: 'SF' });
    });

    it('should work with render method', async () => {
      const weatherTool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }))
        .render(({ data }) => ({ type: 'div', props: { children: `${data.city}: ${data.temp}°` } }) as any);

      const result = await weatherTool.run({ city: 'NYC' });
      expect(result).toEqual({ temp: 72, city: 'NYC' });
      expect(weatherTool.renderer).toBeDefined();
    });
  });

  describe('Complex Tool Pattern', () => {
    it('should support client optimization', async () => {
      const searchTool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ results: [`Server: ${input.query}`] }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.query);
          if (cached) return cached;
          
          const result = { results: [`Client: ${input.query}`] };
          ctx.cache.set(input.query, result);
          return result;
        });

      // Server context (isServer: true)
      const serverResult = await searchTool.run(
        { query: 'test' }, 
        { isServer: true, cache: new Map(), fetch: global.fetch }
      );
      expect(serverResult.results[0]).toBe('Server: test');

      // Client context (isServer: false)
      const clientCache = new Map();
      const clientResult = await searchTool.run(
        { query: 'test' }, 
        { isServer: false, cache: clientCache, fetch: global.fetch }
      );
      expect(clientResult.results[0]).toBe('Client: test');

      // Check caching works
      const cachedResult = await searchTool.run(
        { query: 'test' }, 
        { isServer: false, cache: clientCache, fetch: global.fetch }
      );
      expect(cachedResult).toBe(clientResult); // Same reference = cached
    });
  });

  describe('Frontend/Backend Control', () => {
    it('should allow database queries (backend)', async () => {
      const dbTool = aui
        .tool('queryDB')
        .input(z.object({ table: z.string(), limit: z.number() }))
        .execute(async ({ input }) => ({
          rows: Array(input.limit).fill(null).map((_, i) => ({
            id: i + 1,
            table: input.table
          })),
          count: input.limit
        }));

      const result = await dbTool.run({ table: 'users', limit: 3 });
      expect(result.count).toBe(3);
      expect(result.rows).toHaveLength(3);
      expect(result.rows[0].table).toBe('users');
    });

    it('should allow DOM manipulation (frontend)', async () => {
      const domTool = aui
        .tool('updateDOM')
        .input(z.object({ selector: z.string(), text: z.string() }))
        .clientExecute(async ({ input }) => {
          // Mock DOM operation
          return { 
            success: true, 
            selector: input.selector, 
            text: input.text,
            isClient: true 
          };
        });

      const result = await domTool.run(
        { selector: '#title', text: 'New Title' },
        { isServer: false, cache: new Map(), fetch: global.fetch }
      );
      
      expect(result.success).toBe(true);
      expect(result.isClient).toBe(true);
    });

    it('should handle API calls', async () => {
      const apiTool = aui
        .tool('callAPI')
        .input(z.object({ endpoint: z.string(), method: z.string() }))
        .execute(async ({ input }) => ({
          status: 200,
          endpoint: input.endpoint,
          method: input.method,
          data: { message: 'Success' }
        }));

      const result = await apiTool.run({ endpoint: '/api/users', method: 'GET' });
      expect(result.status).toBe(200);
      expect(result.data.message).toBe('Success');
    });
  });

  describe('Chaining and Fluent Interface', () => {
    it('should support method chaining without build()', async () => {
      const tool = aui
        .tool('chain-test')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ doubled: input.value * 2 }))
        .describe('Doubles a number')
        .tag('math', 'simple')
        .middleware(async ({ input, next }) => {
          // Log before execution
          const result = await next();
          // Log after execution
          return result;
        });

      const result = await tool.run({ value: 5 });
      expect(result.doubled).toBe(10);
      expect(tool.description).toBe('Doubles a number');
      expect(tool.tags).toContain('math');
      expect(tool.tags).toContain('simple');
    });

    it('should return tool directly without build step', () => {
      const tool = aui
        .tool('direct')
        .input(z.object({ test: z.string() }))
        .execute(async ({ input }) => input);

      // Tool is immediately usable
      expect(tool.name).toBe('direct');
      expect(tool.run).toBeDefined();
      expect(typeof tool.run).toBe('function');
    });
  });
});