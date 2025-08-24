import React from 'react';
import aui, { z, t, defineTool } from '../index';
import { globalRegistry } from '../core/registry';

describe('Ultra-Concise AUI API', () => {
  beforeEach(() => {
    // Clear registry before each test
    globalRegistry.tools.clear();
  });

  describe('t() helper', () => {
    it('should create tools with shorthand methods', async () => {
      const tool = t('test')
        .in(z.object({ value: z.number() }))
        .ex(async (input) => input.value * 2)
        .out((data) => React.createElement('div', {}, data))
        .build();

      expect(tool.name).toBe('test');
      expect(tool.inputSchema.parse({ value: 5 })).toEqual({ value: 5 });
      
      const result = await tool.execute({ 
        input: { value: 5 }, 
        ctx: { cache: new Map(), fetch: jest.fn() } 
      });
      expect(result).toBe(10);
    });

    it('should support ultra-short aliases', async () => {
      const tool = t('calc')
        .in(z.object({ a: z.number(), b: z.number() }))
        .ex((input) => input.a + input.b)
        .build();

      const result = await tool.execute({
        input: { a: 3, b: 4 },
        ctx: { cache: new Map(), fetch: jest.fn() }
      });
      expect(result).toBe(7);
    });
  });

  describe('define() method', () => {
    it('should create and return a complete tool in one call', () => {
      const tool = t('one-liner')
        .define(
          z.object({ text: z.string() }),
          (input) => input.text.toUpperCase(),
          (data) => React.createElement('div', {}, data)
        );

      expect(tool.name).toBe('one-liner');
      expect(tool.execute).toBeDefined();
      expect(tool.render).toBeDefined();
    });
  });

  describe('defineTool() helper', () => {
    it('should create a tool with all options', async () => {
      const tool = defineTool('search', {
        input: z.object({ query: z.string() }),
        execute: async (input) => [`Result for ${input.query}`],
        client: async (input, ctx) => {
          ctx.cache.set(input.query, ['cached']);
          return ctx.cache.get(input.query);
        },
        render: (data) => React.createElement('div', {}, data.join(', '))
      });

      expect(tool.name).toBe('search');
      expect(tool.execute).toBeDefined();
      expect(tool.clientExecute).toBeDefined();
      expect(tool.render).toBeDefined();
      
      // Tool should be auto-registered
      expect(globalRegistry.get('search')).toBe(tool);
    });

    it('should work with minimal config', async () => {
      const tool = defineTool('minimal', {
        input: z.object({ x: z.number() }),
        execute: (input) => input.x * 2
      });

      const result = await tool.execute({
        input: { x: 5 },
        ctx: { cache: new Map(), fetch: jest.fn() }
      });
      expect(result).toBe(10);
    });
  });

  describe('aui.create()', () => {
    it('should create and register a tool', () => {
      const tool = aui.create('created', {
        input: z.object({ name: z.string() }),
        execute: (input) => `Hello, ${input.name}!`,
        render: (data) => React.createElement('span', {}, data)
      });

      expect(tool.name).toBe('created');
      expect(globalRegistry.get('created')).toBe(tool);
    });

    it('should support client execution', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ data: 'fetched' });
      
      const tool = aui.create('with-client', {
        input: z.object({ id: z.string() }),
        execute: async (input) => ({ server: input.id }),
        client: async (input, ctx) => {
          const result = await ctx.fetch('/api/data', { body: input });
          return result;
        }
      });

      expect(tool.clientExecute).toBeDefined();
      
      if (tool.clientExecute) {
        const result = await tool.clientExecute({
          input: { id: '123' },
          ctx: { cache: new Map(), fetch: mockFetch }
        });
        expect(result).toEqual({ data: 'fetched' });
      }
    });
  });

  describe('aui.defineTools()', () => {
    it('should define multiple tools at once', () => {
      const tools = aui.defineTools({
        tool1: {
          input: z.object({ a: z.number() }),
          execute: (input) => input.a * 2
        },
        tool2: {
          input: z.object({ b: z.string() }),
          execute: (input) => input.b.toUpperCase(),
          render: (data) => React.createElement('div', {}, data)
        },
        tool3: {
          input: z.object({ c: z.boolean() }),
          execute: (input) => !input.c,
          client: async (input, ctx) => {
            ctx.cache.set('toggle', input.c);
            return !input.c;
          }
        }
      });

      expect(Object.keys(tools)).toHaveLength(3);
      expect(tools.tool1.name).toBe('tool1');
      expect(tools.tool2.name).toBe('tool2');
      expect(tools.tool3.name).toBe('tool3');
      
      // All should be registered
      expect(globalRegistry.get('tool1')).toBe(tools.tool1);
      expect(globalRegistry.get('tool2')).toBe(tools.tool2);
      expect(globalRegistry.get('tool3')).toBe(tools.tool3);
    });

    it('should handle empty object', () => {
      const tools = aui.defineTools({});
      expect(Object.keys(tools)).toHaveLength(0);
    });
  });

  describe('Quick mode', () => {
    it('should auto-build after render in quick mode', () => {
      const result = aui
        .quick('auto-build')
        .in(z.object({ text: z.string() }))
        .ex((input) => input.text)
        .out((data) => React.createElement('div', {}, data));
      
      // Should return a ToolDefinition, not a ToolBuilder
      expect(result.name).toBe('auto-build');
      expect(result.execute).toBeDefined();
      expect(result.render).toBeDefined();
    });
  });

  describe('Simple helper', () => {
    it('should create a simple tool with minimal config', async () => {
      const tool = aui.simple(
        'simple-test',
        z.object({ num: z.number() }),
        (input) => input.num * 3,
        (data) => React.createElement('span', {}, data)
      );

      expect(tool.name).toBe('simple-test');
      const result = await tool.execute({
        input: { num: 4 },
        ctx: { cache: new Map(), fetch: jest.fn() }
      });
      expect(result).toBe(12);
      
      // Should be registered
      expect(globalRegistry.get('simple-test')).toBe(tool);
    });

    it('should work without renderer', async () => {
      const tool = aui.simple(
        'no-render',
        z.object({ val: z.string() }),
        (input) => input.val.length
      );

      const result = await tool.execute({
        input: { val: 'hello' },
        ctx: { cache: new Map(), fetch: jest.fn() }
      });
      expect(result).toBe(5);
    });
  });

  describe('Server-only tools', () => {
    it('should create server-only tools', () => {
      const tool = aui.server(
        'secure',
        z.object({ secret: z.string() }),
        async (input) => ({ processed: true }),
        (data) => React.createElement('div', {}, 'Processed')
      );

      expect(tool.name).toBe('secure');
      expect(tool.isServerOnly).toBe(true);
      expect(tool.clientExecute).toBeUndefined();
    });
  });

  describe('Contextual tools', () => {
    it('should create tools with context support', async () => {
      const tool = aui.contextual(
        'with-context',
        z.object({ key: z.string() }),
        async ({ input, ctx }) => {
          ctx.cache.set(input.key, 'cached-value');
          return ctx.cache.get(input.key);
        },
        (data) => React.createElement('div', {}, data)
      );

      const cache = new Map();
      const result = await tool.execute({
        input: { key: 'test-key' },
        ctx: { cache, fetch: jest.fn() }
      });
      
      expect(result).toBe('cached-value');
      expect(cache.get('test-key')).toBe('cached-value');
    });
  });

  describe('Method chaining', () => {
    it('should support full method chaining', async () => {
      const tool = t('chained')
        .description('A chained tool')
        .metadata({ version: '1.0' })
        .in(z.object({ x: z.number(), y: z.number() }))
        .ex((input) => ({ sum: input.x + input.y, product: input.x * input.y }))
        .output(z.object({ sum: z.number(), product: z.number() }))
        .out(({ sum, product }) => React.createElement('div', {}, `Sum: ${sum}, Product: ${product}`))
        .build();

      expect(tool.description).toBe('A chained tool');
      expect(tool.metadata).toEqual({ version: '1.0' });
      expect(tool.outputSchema).toBeDefined();
      
      const result = await tool.execute({
        input: { x: 3, y: 4 },
        ctx: { cache: new Map(), fetch: jest.fn() }
      });
      expect(result).toEqual({ sum: 7, product: 12 });
    });
  });

  describe('Edge cases', () => {
    it('should handle tools with no input', async () => {
      const tool = t('no-input')
        .ex(async () => ({ timestamp: Date.now() }))
        .build();

      const result = await tool.execute({
        input: {},
        ctx: { cache: new Map(), fetch: jest.fn() }
      });
      expect(result).toHaveProperty('timestamp');
    });

    it('should handle synchronous execution', async () => {
      const tool = t('sync')
        .in(z.object({ val: z.number() }))
        .ex((input) => input.val * 2) // Sync function
        .build();

      const result = await tool.execute({
        input: { val: 5 },
        ctx: { cache: new Map(), fetch: jest.fn() }
      });
      expect(result).toBe(10);
    });

    it('should throw error for tools without execute handler', () => {
      expect(() => {
        t('no-execute')
          .in(z.object({ x: z.number() }))
          .build();
      }).toThrow('Tool "no-execute" must have an execute handler');
    });
  });
});