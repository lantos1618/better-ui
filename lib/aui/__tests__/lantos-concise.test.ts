import { describe, it, expect, beforeEach } from '@jest/globals';
import aui, { z } from '../index';
import { createRegistry } from '../core/registry';

describe('AUI Lantos Concise API', () => {
  beforeEach(() => {
    // Clear registry between tests
    const freshRegistry = createRegistry();
    (aui as any).registry = freshRegistry;
  });

  describe('Ultra-Concise Patterns', () => {
    it('should create simple tool with just 2 methods', async () => {
      const tool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }))
        .render(({ data }) => `${data.city}: ${data.temp}°`)
        .build();

      expect(tool.name).toBe('weather');
      
      const result = await tool.execute({
        input: { city: 'SF' },
        ctx: { cache: new Map(), fetch: jest.fn(), userId: 'test' }
      });
      
      expect(result).toEqual({ temp: 72, city: 'SF' });
    });

    it('should create complex tool with client optimization', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ data: 'server' });
      const cache = new Map();
      cache.set('test', { data: 'cached' });

      const tool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ results: ['server'] }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.query);
          return cached || ctx.fetch('/api/search', { body: input });
        })
        .render(({ data }) => `Results: ${JSON.stringify(data)}`)
        .build();

      // Test client execution with cache hit
      const cachedResult = await tool.clientExecute!({
        input: { query: 'test' },
        ctx: { cache, fetch: mockFetch, userId: 'test' }
      });
      expect(cachedResult).toEqual({ data: 'cached' });
      expect(mockFetch).not.toHaveBeenCalled();

      // Test client execution with cache miss
      const freshResult = await tool.clientExecute!({
        input: { query: 'new' },
        ctx: { cache, fetch: mockFetch, userId: 'test' }
      });
      expect(freshResult).toEqual({ data: 'server' });
      expect(mockFetch).toHaveBeenCalledWith('/api/search', { body: { query: 'new' } });
    });
  });

  describe('One-liner Tools', () => {
    it('should create tool with aui.do()', async () => {
      const pingTool = aui.do('ping', () => 'pong');
      
      expect(pingTool.name).toBe('ping');
      
      const result = await pingTool.execute({
        input: {},
        ctx: { cache: new Map(), fetch: jest.fn(), userId: 'test' }
      });
      
      expect(result).toBe('pong');
    });

    it('should handle aui.do() with typed input', async () => {
      const echoTool = aui.do('echo', (msg: string) => `Echo: ${msg}`);
      
      const result = await echoTool.execute({
        input: 'hello',
        ctx: { cache: new Map(), fetch: jest.fn(), userId: 'test' }
      });
      
      expect(result).toBe('Echo: hello');
    });

    it('should handle aui.do() with config object', async () => {
      const tool = aui.do('calc', {
        input: z.object({ a: z.number(), b: z.number() }),
        execute: (input) => input.a + input.b,
        render: (data) => `Result: ${data}`
      });

      const result = await tool.execute({
        input: { a: 5, b: 3 },
        ctx: { cache: new Map(), fetch: jest.fn(), userId: 'test' }
      });

      expect(result).toBe(8);
    });
  });

  describe('Helper Methods', () => {
    it('should create and register with aui.simple()', async () => {
      const tool = aui.simple(
        'greeting',
        z.object({ name: z.string() }),
        async (input) => `Hello, ${input.name}!`,
        (data) => data
      );

      expect(tool.name).toBe('greeting');
      expect(aui.getTool('greeting')).toBe(tool);

      const result = await tool.execute({
        input: { name: 'World' },
        ctx: { cache: new Map(), fetch: jest.fn(), userId: 'test' }
      });

      expect(result).toBe('Hello, World!');
    });

    it('should create server-only tool with aui.server()', async () => {
      const tool = aui.server(
        'db-write',
        z.object({ table: z.string(), data: z.record(z.any()) }),
        async (input) => ({ id: 123, ...input.data }),
        (data) => `Created: ${data.id}`
      );

      expect(tool.isServerOnly).toBe(true);
      expect(tool.clientExecute).toBeUndefined();
    });

    it('should create contextual tool with aui.contextual()', async () => {
      const tool = aui.contextual(
        'user-info',
        z.object({ userId: z.string().optional() }),
        async ({ input, ctx }) => {
          const id = input.userId || ctx.userId || 'anonymous';
          return { id, name: `User ${id}` };
        },
        (user) => `${user.name} (${user.id})`
      );

      const result = await tool.execute({
        input: {},
        ctx: { cache: new Map(), fetch: jest.fn(), userId: 'ctx-123' }
      });

      expect(result).toEqual({ id: 'ctx-123', name: 'User ctx-123' });
    });
  });

  describe('AI-Optimized Tools', () => {
    it('should create AI tool with retry logic', async () => {
      let attempts = 0;
      const tool = aui.ai('flaky-api', {
        input: z.object({ id: z.string() }),
        execute: async (input) => {
          attempts++;
          if (attempts < 3) {
            throw new Error('API failed');
          }
          return { id: input.id, data: 'success' };
        },
        retry: 3,
        timeout: 5000,
        cache: true
      });

      const result = await tool.execute({
        input: { id: 'test' },
        ctx: { cache: new Map(), fetch: jest.fn(), userId: 'test' }
      });

      expect(attempts).toBe(3);
      expect(result).toEqual({ id: 'test', data: 'success' });
      expect(tool.metadata?.aiOptimized).toBe(true);
    });
  });

  describe('Batch Definition', () => {
    it('should define multiple tools at once', () => {
      const tools = aui.defineTools({
        'tool1': {
          input: z.object({ x: z.number() }),
          execute: (input) => input.x * 2,
          render: (data) => `Double: ${data}`
        },
        'tool2': {
          input: z.object({ y: z.string() }),
          execute: (input) => input.y.toUpperCase(),
          render: (data) => `Upper: ${data}`
        }
      });

      expect(tools.tool1.name).toBe('tool1');
      expect(tools.tool2.name).toBe('tool2');
      expect(aui.getTool('tool1')).toBe(tools.tool1);
      expect(aui.getTool('tool2')).toBe(tools.tool2);
    });

    it('should batch create AI tools', () => {
      const tools = aui.aiTools({
        'ai-tool1': {
          execute: () => 'result1',
          retry: 3
        },
        'ai-tool2': {
          input: z.object({ x: z.number() }),
          execute: (input) => input.x * 2,
          cache: true
        }
      });

      expect(tools['ai-tool1'].metadata?.aiOptimized).toBe(true);
      expect(tools['ai-tool2'].metadata?.cache).toBe(true);
    });
  });

  describe('Ultra-Concise Shortcuts', () => {
    it('should work with single-letter shortcuts', async () => {
      const tool = aui.t('quick')
        .i(z.object({ n: z.number() }))
        .e(async (input) => input.n * input.n)
        .r((data) => `Square: ${data}`)
        .b();

      expect(tool.name).toBe('quick');
      
      const result = await tool.execute({
        input: { n: 5 },
        ctx: { cache: new Map(), fetch: jest.fn(), userId: 'test' }
      });
      
      expect(result).toBe(25);
    });

    it('should support quick mode for auto-build', () => {
      const tool = aui
        .quick('auto')
        .input(z.object({ x: z.number() }))
        .execute((input) => input.x + 1)
        .render((data) => `Plus one: ${data}`);

      // In quick mode, it should auto-build and return the tool
      expect(tool.name).toBe('auto');
    });
  });

  describe('Builder Method Chains', () => {
    it('should support .run() shorthand', async () => {
      const tool = aui
        .tool('runner')
        .input(z.object({ x: z.number() }))
        .run(
          (input) => input.x * 3,
          (data) => `Triple: ${data}`
        )
        .build();

      const result = await tool.execute({
        input: { x: 4 },
        ctx: { cache: new Map(), fetch: jest.fn(), userId: 'test' }
      });

      expect(result).toBe(12);
    });

    it('should support .handle() shorthand', async () => {
      const tool = aui
        .tool('handler')
        .handle(
          z.object({ msg: z.string() }),
          async (input) => input.msg.length
        )
        .render((len) => `Length: ${len}`)
        .build();

      const result = await tool.execute({
        input: { msg: 'hello' },
        ctx: { cache: new Map(), fetch: jest.fn(), userId: 'test' }
      });

      expect(result).toBe(5);
    });

    it('should support .define() for all-in-one', async () => {
      const tool = aui
        .tool('definer')
        .define(
          z.object({ a: z.number(), b: z.number() }),
          async (input) => input.a - input.b,
          (result) => `Difference: ${result}`
        );

      const result = await tool.execute({
        input: { a: 10, b: 3 },
        ctx: { cache: new Map(), fetch: jest.fn(), userId: 'test' }
      });

      expect(result).toBe(7);
    });
  });

  describe('Type Inference', () => {
    it('should properly infer types through the chain', () => {
      const tool = aui
        .tool('typed')
        .input(z.object({ 
          name: z.string(),
          age: z.number() 
        }))
        .execute(async ({ input }) => ({
          greeting: `Hello ${input.name}`,
          canVote: input.age >= 18
        }))
        .render(({ data }) => `${data.greeting}, can vote: ${data.canVote}`)
        .build();

      // TypeScript should infer these types correctly
      type InputType = Parameters<typeof tool.execute>[0]['input'];
      type OutputType = Awaited<ReturnType<typeof tool.execute>>;

      // These assertions verify type inference works
      const testInput: InputType = { name: 'Test', age: 21 };
      expect(testInput).toHaveProperty('name');
      expect(testInput).toHaveProperty('age');
    });
  });

  describe('Error Handling', () => {
    it('should validate input schema', async () => {
      const tool = aui
        .tool('validated')
        .input(z.object({ 
          email: z.string().email(),
          age: z.number().min(0).max(120)
        }))
        .execute(async ({ input }) => input)
        .build();

      const invalidInput = { email: 'not-an-email', age: 150 };
      const validationResult = tool.inputSchema.safeParse(invalidInput);
      
      expect(validationResult.success).toBe(false);
    });

    it('should require execute handler', () => {
      expect(() => {
        aui
          .tool('no-execute')
          .input(z.object({ x: z.number() }))
          .build();
      }).toThrow('must have an execute handler');
    });
  });
});