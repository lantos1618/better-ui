import aui, { AUI, AUITool } from '../index';
import { z } from 'zod';

describe('AUI Tool System', () => {
  let testAUI: AUI;

  beforeEach(() => {
    testAUI = new AUI();
    jest.clearAllMocks();
  });

  describe('Tool Creation', () => {
    it('should create a simple tool with just execute and render', () => {
      const tool = testAUI
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }));

      expect(tool.name).toBe('weather');
      expect(tool.schema).toBeDefined();
    });

    it('should create a complex tool with client optimization', () => {
      const tool = testAUI
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ results: [`Result for ${input.query}`] }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.query);
          return cached || { results: [`Client result for ${input.query}`] };
        });

      expect(tool.name).toBe('search');
      expect(tool.getConfig().clientHandler).toBeDefined();
    });

    it('should support middleware', () => {
      const middlewareFn = jest.fn(async ({ next }) => next());
      
      const tool = testAUI
        .tool('protected')
        .input(z.object({ data: z.string() }))
        .middleware(middlewareFn)
        .execute(async ({ input }) => ({ data: input.data }));

      expect(tool.getConfig().middleware).toHaveLength(1);
    });

    it('should support tags and description', () => {
      const tool = testAUI
        .tool('tagged')
        .describe('A tagged tool')
        .tag('api', 'database')
        .execute(async () => ({ result: 'ok' }));

      expect(tool.description).toBe('A tagged tool');
      expect(tool.tags).toEqual(['api', 'database']);
    });
  });

  describe('Tool Execution', () => {
    it('should execute a simple tool', async () => {
      const tool = testAUI
        .tool('calc')
        .input(z.object({ a: z.number(), b: z.number() }))
        .execute(async ({ input }) => ({ result: input.a + input.b }));

      const result = await tool.run({ a: 5, b: 3 });
      expect(result).toEqual({ result: 8 });
    });

    it('should validate input with Zod schema', async () => {
      const tool = testAUI
        .tool('strict')
        .input(z.object({ 
          email: z.string().email(),
          age: z.number().min(0).max(120)
        }))
        .execute(async ({ input }) => ({ valid: true, ...input }));

      await expect(
        tool.run({ email: 'invalid', age: 25 })
      ).rejects.toThrow();

      const result = await tool.run({ email: 'test@example.com', age: 25 });
      expect(result.valid).toBe(true);
    });

    it('should use client handler when not on server', async () => {
      const tool = testAUI
        .tool('optimized')
        .input(z.object({ id: z.string() }))
        .execute(async ({ input }) => ({ source: 'server', id: input.id }))
        .clientExecute(async ({ input }) => ({ source: 'client', id: input.id }));

      const clientCtx = { cache: new Map(), fetch, isServer: false };
      const result = await tool.run({ id: '123' }, clientCtx);
      expect(result.source).toBe('client');
    });

    it('should apply middleware in order', async () => {
      const order: string[] = [];
      
      const tool = testAUI
        .tool('middleware-test')
        .middleware(async ({ next }) => {
          order.push('middleware1-before');
          const result = await next();
          order.push('middleware1-after');
          return result;
        })
        .middleware(async ({ next }) => {
          order.push('middleware2-before');
          const result = await next();
          order.push('middleware2-after');
          return result;
        })
        .execute(async () => {
          order.push('execute');
          return { done: true };
        });

      await tool.run({});
      
      expect(order).toEqual([
        'middleware1-before',
        'middleware2-before',
        'execute',
        'middleware2-after',
        'middleware1-after'
      ]);
    });

    it('should handle context caching', async () => {
      const ctx = testAUI.createContext();
      ctx.cache.set('key1', 'value1');
      ctx.isServer = false; // Ensure client mode
      
      const tool = testAUI
        .tool('cache-test')
        .execute(async () => ({ cached: null })) // Fallback server handler
        .clientExecute(async ({ ctx }) => {
          return { cached: ctx.cache.get('key1') };
        });

      const result = await tool.run({}, ctx);
      expect(result.cached).toBe('value1');
    });
  });

  describe('Tool Registry', () => {
    it('should register and retrieve tools', () => {
      const tool1 = testAUI.tool('tool1').execute(async () => ({}));
      const tool2 = testAUI.tool('tool2').execute(async () => ({}));

      expect(testAUI.get('tool1')).toBe(tool1);
      expect(testAUI.get('tool2')).toBe(tool2);
      expect(testAUI.getToolNames()).toEqual(['tool1', 'tool2']);
    });

    it('should list all tools', () => {
      testAUI.tool('a').execute(async () => ({}));
      testAUI.tool('b').execute(async () => ({}));
      testAUI.tool('c').execute(async () => ({}));

      const tools = testAUI.list();
      expect(tools).toHaveLength(3);
      expect(tools.map(t => t.name)).toEqual(['a', 'b', 'c']);
    });

    it('should find tools by tag', () => {
      testAUI.tool('api1').tag('api', 'rest').execute(async () => ({}));
      testAUI.tool('api2').tag('api', 'graphql').execute(async () => ({}));
      testAUI.tool('db1').tag('database').execute(async () => ({}));

      const apiTools = testAUI.findByTag('api');
      expect(apiTools).toHaveLength(2);
      
      const restTools = testAUI.findByTags('api', 'rest');
      expect(restTools).toHaveLength(1);
      expect(restTools[0].name).toBe('api1');
    });

    it('should execute tools by name', async () => {
      testAUI
        .tool('executable')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ doubled: input.value * 2 }));

      const result = await testAUI.execute('executable', { value: 5 });
      expect(result).toEqual({ doubled: 10 });
    });

    it('should clear and remove tools', () => {
      testAUI.tool('temp1').execute(async () => ({}));
      testAUI.tool('temp2').execute(async () => ({}));
      
      expect(testAUI.has('temp1')).toBe(true);
      testAUI.remove('temp1');
      expect(testAUI.has('temp1')).toBe(false);
      
      testAUI.clear();
      expect(testAUI.getToolNames()).toEqual([]);
    });
  });

  describe('Tool Serialization', () => {
    it('should serialize tool metadata to JSON', () => {
      const tool = testAUI
        .tool('serializable')
        .describe('A test tool')
        .tag('test', 'demo')
        .input(z.object({ data: z.string() }))
        .execute(async ({ input }) => ({ echo: input.data }))
        .clientExecute(async ({ input }) => ({ client: input.data }))
        .middleware(async ({ next }) => next());

      const json = tool.toJSON();
      
      expect(json).toEqual({
        name: 'serializable',
        description: 'A test tool',
        tags: ['test', 'demo'],
        hasInput: true,
        hasExecute: true,
        hasClientExecute: true,
        hasRender: false,
        hasMiddleware: true
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error when execute handler is missing', async () => {
      const tool = testAUI.tool('incomplete').input(z.object({ x: z.number() }));
      
      await expect(tool.run({ x: 1 })).rejects.toThrow('Tool incomplete has no execute handler');
    });

    it('should handle errors in execute handler', async () => {
      const tool = testAUI
        .tool('error-tool')
        .execute(async () => {
          throw new Error('Execution failed');
        });

      await expect(tool.run({})).rejects.toThrow('Execution failed');
    });

    it('should handle errors in middleware', async () => {
      const tool = testAUI
        .tool('middleware-error')
        .middleware(async () => {
          throw new Error('Middleware failed');
        })
        .execute(async () => ({ ok: true }));

      await expect(tool.run({})).rejects.toThrow('Middleware failed');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle database CRUD operations', async () => {
      const mockDb = new Map([['1', { id: '1', name: 'Item 1' }]]);
      
      const crudTool = testAUI
        .tool('crud')
        .input(z.object({
          action: z.enum(['create', 'read', 'update', 'delete']),
          id: z.string().optional(),
          data: z.any().optional()
        }))
        .execute(async ({ input }) => {
          switch (input.action) {
            case 'create':
              const id = Date.now().toString();
              mockDb.set(id, { id, ...input.data });
              return { id, ...input.data };
            case 'read':
              return mockDb.get(input.id!) || null;
            case 'update':
              const existing = mockDb.get(input.id!);
              if (existing) {
                const updated = { ...existing, ...input.data };
                mockDb.set(input.id!, updated);
                return updated;
              }
              return null;
            case 'delete':
              return { deleted: mockDb.delete(input.id!) };
            default:
              throw new Error('Invalid action');
          }
        });

      // Create
      const created = await crudTool.run({ 
        action: 'create', 
        data: { name: 'New Item' }
      });
      expect(created.name).toBe('New Item');

      // Read
      const read = await crudTool.run({ 
        action: 'read', 
        id: '1' 
      });
      expect(read.name).toBe('Item 1');

      // Update
      const updated = await crudTool.run({ 
        action: 'update', 
        id: '1',
        data: { name: 'Updated Item' }
      });
      expect(updated.name).toBe('Updated Item');

      // Delete
      const deleted = await crudTool.run({ 
        action: 'delete', 
        id: '1' 
      });
      expect(deleted.deleted).toBe(true);
    });

    it('should handle API proxy with caching', async () => {
      const fetchMock = jest.fn().mockResolvedValue({ data: 'api response' });
      
      const apiTool = testAUI
        .tool('api')
        .input(z.object({ endpoint: z.string(), method: z.string() }))
        .execute(async () => ({ data: 'server fallback' })) // Add server handler
        .clientExecute(async ({ input, ctx }) => {
          const cacheKey = `${input.method}:${input.endpoint}`;
          
          if (input.method === 'GET') {
            const cached = ctx.cache.get(cacheKey);
            if (cached) return cached;
          }
          
          const result = await fetchMock(input.endpoint);
          
          if (input.method === 'GET') {
            ctx.cache.set(cacheKey, result);
          }
          
          return result;
        });

      const ctx = testAUI.createContext();
      ctx.isServer = false; // Ensure client mode
      
      // First call - should fetch
      await apiTool.run({ endpoint: '/api/data', method: 'GET' }, ctx);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      
      // Second call - should use cache
      await apiTool.run({ endpoint: '/api/data', method: 'GET' }, ctx);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      
      // POST call - should not cache
      await apiTool.run({ endpoint: '/api/data', method: 'POST' }, ctx);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});

describe('Global AUI Instance', () => {
  it('should export a default AUI instance', () => {
    expect(aui).toBeInstanceOf(AUI);
  });

  it('should persist tools across imports', () => {
    const tool = aui.tool('global-test').execute(async () => ({ global: true }));
    expect(aui.get('global-test')).toBe(tool);
  });
});