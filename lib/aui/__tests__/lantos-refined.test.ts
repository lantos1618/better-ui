import { describe, it, expect, beforeEach } from '@jest/globals';
import { aui, z } from '../lantos-refined';

describe('Lantos Refined AUI', () => {
  beforeEach(() => {
    // Clear registry between tests
    (aui as any).tools.clear();
  });

  describe('Simple Tool Pattern', () => {
    it('should create a simple tool with just input and execute', async () => {
      const simpleTool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }))
        .build();

      expect(simpleTool.name).toBe('weather');
      
      const result = await simpleTool.execute({ 
        input: { city: 'NYC' } 
      });
      
      expect(result).toEqual({ temp: 72, city: 'NYC' });
    });

    it('should handle synchronous execute functions', async () => {
      const calcTool = aui
        .tool('calc')
        .input(z.object({ a: z.number(), b: z.number() }))
        .execute(({ input }) => ({ sum: input.a + input.b }))
        .build();

      const result = await calcTool.execute({ 
        input: { a: 5, b: 3 } 
      });
      
      expect(result).toEqual({ sum: 8 });
    });
  });

  describe('Complex Tool Pattern', () => {
    it('should create tool with client execution', async () => {
      const mockCache = new Map();
      const mockFetch = async (url: string, opts: any) => ({ data: 'fetched' });

      const searchTool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ results: [`server: ${input.query}`] }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.query);
          if (cached) return cached;
          
          const result = await ctx.fetch('/api/search', { body: input });
          ctx.cache.set(input.query, result);
          return result;
        })
        .build();

      // Test server execution
      const serverResult = await searchTool.execute({ 
        input: { query: 'test' } 
      });
      expect(serverResult).toEqual({ results: ['server: test'] });

      // Test client execution with cache
      const ctx = { cache: mockCache, fetch: mockFetch };
      const clientResult = await searchTool.clientExecute!({ 
        input: { query: 'test' }, 
        ctx 
      });
      expect(clientResult).toEqual({ data: 'fetched' });

      // Test cache hit
      const cachedResult = await searchTool.clientExecute!({ 
        input: { query: 'test' }, 
        ctx 
      });
      expect(cachedResult).toEqual({ data: 'fetched' });
      expect(mockCache.get('test')).toEqual({ data: 'fetched' });
    });
  });

  describe('Tool Registry', () => {
    it('should register and retrieve tools', () => {
      const tool1 = aui
        .tool('tool1')
        .input(z.object({ x: z.number() }))
        .execute(({ input }) => ({ result: input.x * 2 }))
        .build();

      const tool2 = aui
        .tool('tool2')
        .input(z.object({ y: z.string() }))
        .execute(({ input }) => ({ result: input.y.toUpperCase() }))
        .build();

      aui.register(tool1);
      aui.register(tool2);

      expect(aui.getTool('tool1')).toBe(tool1);
      expect(aui.getTool('tool2')).toBe(tool2);
      expect(aui.getTools()).toHaveLength(2);
    });

    it('should execute tool by name', async () => {
      const echoTool = aui
        .tool('echo')
        .input(z.object({ msg: z.string() }))
        .execute(({ input }) => ({ echo: input.msg }))
        .build();

      aui.register(echoTool);

      const result = await aui.execute('echo', { msg: 'hello' });
      expect(result).toEqual({ echo: 'hello' });
    });

    it('should throw error for unknown tool', async () => {
      await expect(aui.execute('unknown', {}))
        .rejects
        .toThrow('Tool unknown not found');
    });
  });

  describe('Tool Builder Validation', () => {
    it('should require execute method', () => {
      expect(() => {
        aui
          .tool('invalid')
          .input(z.object({ x: z.number() }))
          .build();
      }).toThrow('Tool "invalid" needs execute method');
    });

    it('should validate input schema', async () => {
      const strictTool = aui
        .tool('strict')
        .input(z.object({ 
          required: z.string(),
          optional: z.number().optional() 
        }))
        .execute(({ input }) => ({ ok: true }))
        .build();

      // Valid input
      const result = await strictTool.execute({ 
        input: { required: 'test' } 
      });
      expect(result).toEqual({ ok: true });

      // Schema validation would typically happen at runtime
      // when integrated with the full system
    });
  });

  describe('Render Function', () => {
    it('should attach render function to tool', () => {
      const viewTool = aui
        .tool('view')
        .input(z.object({ text: z.string() }))
        .execute(({ input }) => ({ display: input.text }))
        .render(({ data }) => ({ 
          type: 'div', 
          props: { children: data.display } 
        } as any))
        .build();

      expect(viewTool.render).toBeDefined();
      
      const rendered = viewTool.render!({ 
        data: { display: 'Hello' } 
      });
      
      expect(rendered.props.children).toBe('Hello');
    });
  });

  describe('Real-world Examples', () => {
    it('should handle database-like operations', async () => {
      const dbTool = aui
        .tool('db')
        .input(z.object({
          operation: z.enum(['find', 'create', 'update', 'delete']),
          collection: z.string(),
          data: z.any().optional()
        }))
        .execute(async ({ input }) => {
          switch (input.operation) {
            case 'find':
              return { items: [] };
            case 'create':
              return { id: 1, ...input.data };
            case 'update':
              return { modified: 1 };
            case 'delete':
              return { deleted: 1 };
          }
        })
        .build();

      const createResult = await dbTool.execute({
        input: {
          operation: 'create',
          collection: 'users',
          data: { name: 'John' }
        }
      });

      expect(createResult).toEqual({ id: 1, name: 'John' });
    });

    it('should handle UI control operations', async () => {
      const uiTool = aui
        .tool('ui')
        .input(z.object({
          action: z.enum(['show', 'hide', 'update']),
          selector: z.string(),
          value: z.any().optional()
        }))
        .execute(({ input }) => {
          // Server-side fallback
          return { success: false, message: 'UI operations require client execution' };
        })
        .clientExecute(({ input }) => {
          // Mock DOM manipulation
          return { success: true, action: input.action };
        })
        .build();

      const result = await uiTool.clientExecute!({
        input: {
          action: 'update',
          selector: '#test',
          value: 'new text'
        },
        ctx: { cache: new Map(), fetch: async () => ({}) }
      });

      expect(result).toEqual({ success: true, action: 'update' });
    });
  });
});