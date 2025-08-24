import { aui } from '../index';
import { z } from 'zod';

describe('Lantos AUI API', () => {
  beforeEach(() => {
    // Clear registry between tests
    aui.getTools().forEach(tool => {
      // Registry cleanup if needed
    });
  });

  describe('Simple Tool Pattern', () => {
    it('should create a simple tool with just execute and render', () => {
      const tool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }))
        .render(({ data }) => `${data.city}: ${data.temp}°`)
        .build();

      expect(tool.name).toBe('weather');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
      expect(tool.render).toBeDefined();
    });

    it('should execute simple tool correctly', async () => {
      const tool = aui
        .tool('test')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ doubled: input.value * 2 }))
        .build();

      const result = await tool.execute({ input: { value: 5 } });
      expect(result).toEqual({ doubled: 10 });
    });
  });

  describe('Complex Tool Pattern', () => {
    it('should create tool with client optimization', () => {
      const mockCache = new Map();
      
      const tool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ results: [`server: ${input.query}`] }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = mockCache.get(input.query);
          if (cached) return cached;
          
          const result = { results: [`client: ${input.query}`] };
          mockCache.set(input.query, result);
          return result;
        })
        .build();

      expect(tool.clientExecute).toBeDefined();
      expect(tool.isServerOnly).toBe(false);
    });
  });

  describe('Ultra-Concise Methods', () => {
    it('should create tool with aui.simple()', () => {
      const tool = aui.simple(
        'ping',
        z.object({ msg: z.string() }),
        async ({ msg }) => ({ pong: msg }),
        ({ pong }) => `Pong: ${pong}`
      );

      expect(tool.name).toBe('ping');
      expect(tool.execute).toBeDefined();
    });

    it('should create tool with aui.do()', async () => {
      const tool = aui.do('timestamp', () => ({ time: 'now' }));
      
      expect(tool.name).toBe('timestamp');
      const result = await tool.execute({ input: {} });
      expect(result).toEqual({ time: 'now' });
    });

    it('should create AI-optimized tool', () => {
      const tool = aui.ai('smart', {
        input: z.object({ query: z.string() }),
        execute: async ({ query }) => ({ answer: query }),
        retry: 3,
        cache: true,
        timeout: 5000
      });

      expect(tool.name).toBe('smart');
      expect(tool.metadata?.retry).toBe(3);
      expect(tool.metadata?.cache).toBe(true);
    });
  });

  describe('Batch Definitions', () => {
    it('should define multiple tools at once', () => {
      const tools = aui.defineTools({
        tool1: {
          input: z.object({ a: z.string() }),
          execute: async ({ a }) => ({ result: a })
        },
        tool2: {
          input: z.object({ b: z.number() }),
          execute: async ({ b }) => ({ result: b * 2 })
        }
      });

      expect(tools.tool1.name).toBe('tool1');
      expect(tools.tool2.name).toBe('tool2');
    });
  });

  describe('Type Inference', () => {
    it('should properly infer types through the chain', () => {
      const tool = aui
        .tool('typed')
        .input(z.object({ 
          str: z.string(),
          num: z.number() 
        }))
        .execute(async ({ input }) => ({
          combined: `${input.str}-${input.num}`,
          double: input.num * 2
        }))
        .build();

      // TypeScript should infer these types correctly
      type Input = z.infer<typeof tool.inputSchema>;
      type Output = Awaited<ReturnType<typeof tool.execute>>;
      
      // These assertions verify type structure
      const testInput: Input = { str: 'test', num: 42 };
      expect(testInput).toBeDefined();
    });
  });

  describe('Server-Only Tools', () => {
    it('should create server-only tool', () => {
      const tool = aui.server(
        'database',
        z.object({ query: z.string() }),
        async ({ query }) => ({ data: `DB result for: ${query}` })
      );

      expect(tool.isServerOnly).toBe(true);
      expect(tool.clientExecute).toBeUndefined();
    });
  });

  describe('Contextual Tools', () => {
    it('should create context-aware tool', async () => {
      const tool = aui.contextual(
        'contextual',
        z.object({ value: z.string() }),
        async ({ input, ctx }) => ({ 
          result: input.value,
          hasContext: ctx !== undefined 
        })
      );

      const result = await tool.execute({ 
        input: { value: 'test' },
        ctx: {} as any 
      });
      
      expect(result.result).toBe('test');
    });
  });
});