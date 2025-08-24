import { describe, it, expect, beforeEach } from '@jest/globals';
import aui, { z } from '../index';
import { createRegistry } from '../core/registry';

describe('AUI - Ultra-Concise API Tests', () => {
  beforeEach(() => {
    // Clear registry between tests
    aui.getTools().forEach(tool => {
      aui['registry'].tools.delete(tool.name);
    });
  });

  describe('Basic Tool Creation', () => {
    it('should create a simple tool with .do()', () => {
      const tool = aui.do('ping', () => 'pong');
      
      expect(tool.name).toBe('ping');
      expect(tool.execute).toBeDefined();
    });

    it('should create tool with input and execute', () => {
      const tool = aui
        .tool('add')
        .input(z.object({ a: z.number(), b: z.number() }))
        .execute(({ input }) => input.a + input.b)
        .build();

      expect(tool.name).toBe('add');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
    });

    it('should use shorthand aliases', () => {
      const tool = aui
        .t('calc')
        .i(z.object({ x: z.number() }))
        .e(({ x }) => x * 2)
        .b();

      expect(tool.name).toBe('calc');
      expect(tool.execute).toBeDefined();
    });
  });

  describe('Tool Execution', () => {
    it('should execute simple tool', async () => {
      const tool = aui.do('echo', (input: string) => input);
      const result = await tool.execute({ 
        input: 'hello',
        ctx: { cache: new Map(), fetch: () => Promise.resolve({}) as any }
      });
      
      expect(result).toBe('hello');
    });

    it('should execute tool with complex input', async () => {
      const tool = aui
        .tool('weather')
        .input(z.object({ city: z.string(), units: z.enum(['C', 'F']) }))
        .execute(({ input }) => ({ 
          city: input.city, 
          temp: input.units === 'C' ? 20 : 68 
        }))
        .build();

      const result = await tool.execute({
        input: { city: 'Paris', units: 'C' },
        ctx: { cache: new Map(), fetch: (() => Promise.resolve({})) as any }
      });

      expect(result).toEqual({ city: 'Paris', temp: 20 });
    });

    it('should handle async execution', async () => {
      const tool = aui.simple(
        'async',
        z.object({ delay: z.number() }),
        async ({ delay }) => {
          await new Promise(r => setTimeout(r, delay));
          return 'done';
        }
      );

      const result = await tool.execute({
        input: { delay: 10 },
        ctx: { cache: new Map(), fetch: (() => Promise.resolve({})) as any }
      });

      expect(result).toBe('done');
    });
  });

  describe('Helper Methods', () => {
    it('should create tool with .simple()', () => {
      const tool = aui.simple(
        'greet',
        z.object({ name: z.string() }),
        ({ name }) => `Hello, ${name}!`
      );

      expect(tool.name).toBe('greet');
      expect(tool.execute).toBeDefined();
    });

    it('should create AI-optimized tool', () => {
      const tool = aui.ai('smart', {
        input: z.object({ query: z.string() }),
        execute: async ({ query }) => ({ answer: query }),
        retry: 3,
        cache: true
      });

      expect(tool.name).toBe('smart');
      expect(tool.metadata?.aiOptimized).toBe(true);
      expect(tool.metadata?.retry).toBe(3);
    });

    it('should batch define tools', () => {
      const tools = aui.defineTools({
        tool1: {
          input: z.object({ x: z.number() }),
          execute: ({ x }) => x * 2
        },
        tool2: {
          input: z.object({ y: z.string() }),
          execute: ({ y }) => y.toUpperCase()
        }
      });

      expect(tools.tool1.name).toBe('tool1');
      expect(tools.tool2.name).toBe('tool2');
    });
  });

  describe('Client/Server Execution', () => {
    it('should support client execution', async () => {
      const tool = aui
        .tool('cached')
        .input(z.object({ key: z.string() }))
        .execute(({ input }) => `server: ${input.key}`)
        .clientExecute(({ input, ctx }) => {
          const cached = ctx.cache.get(input.key);
          return cached || `client: ${input.key}`;
        })
        .build();

      expect(tool.clientExecute).toBeDefined();
      
      const ctx = { cache: new Map(), fetch: (() => Promise.resolve({})) as any };
      ctx.cache.set('test', 'cached value');
      
      const result = await tool.clientExecute!({ 
        input: { key: 'test' }, 
        ctx 
      });
      
      expect(result).toBe('cached value');
    });

    it('should mark server-only tools', () => {
      const tool = aui.server(
        'db',
        z.object({ query: z.string() }),
        async ({ query }) => ({ rows: [] })
      );

      expect(tool.isServerOnly).toBe(true);
      expect(tool.clientExecute).toBeUndefined();
    });
  });

  describe('Registry Operations', () => {
    it('should register and retrieve tools', () => {
      const tool = aui.do('test', () => 'result');
      aui.register(tool);
      
      const retrieved = aui.getTool('test');
      expect(retrieved).toBe(tool);
    });

    it('should list all tools', () => {
      aui.do('tool1', () => 1);
      aui.do('tool2', () => 2);
      
      const tools = aui.getTools();
      const names = tools.map(t => t.name);
      
      expect(names).toContain('tool1');
      expect(names).toContain('tool2');
    });
  });

  describe('Advanced Patterns', () => {
    it('should support contextual tools', async () => {
      const tool = aui.contextual(
        'context',
        z.object({ action: z.string() }),
        async ({ input, ctx }) => {
          return { action: input.action, hasCache: !!ctx.cache };
        }
      );

      const result = await tool.execute({
        input: { action: 'test' },
        ctx: { cache: new Map(), fetch: (() => Promise.resolve({})) as any }
      });

      expect(result).toEqual({ action: 'test', hasCache: true });
    });

    it('should handle tool with all features', async () => {
      const tool = aui
        .tool('complete')
        .description('A complete tool example')
        .input(z.object({ value: z.number() }))
        .output(z.object({ result: z.number() }))
        .execute(({ input }) => ({ result: input.value * 2 }))
        .clientExecute(({ input, ctx }) => {
          const cached = ctx.cache.get(input.value);
          return cached || { result: input.value * 3 };
        })
        .metadata({ version: '1.0' })
        .build();

      expect(tool.name).toBe('complete');
      expect(tool.description).toBe('A complete tool example');
      expect(tool.metadata?.version).toBe('1.0');
      expect(tool.outputSchema).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error for tool without execute', () => {
      expect(() => {
        aui.tool('invalid').build();
      }).toThrow('must have an execute handler');
    });

    it('should handle execution errors with retry', async () => {
      let attempts = 0;
      const tool = aui.ai('flaky', {
        execute: async () => {
          attempts++;
          if (attempts < 3) throw new Error('Failed');
          return 'success';
        },
        retry: 3
      });

      const result = await tool.execute({
        input: {},
        ctx: { cache: new Map(), fetch: (() => Promise.resolve({})) as any }
      });

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });
  });
});