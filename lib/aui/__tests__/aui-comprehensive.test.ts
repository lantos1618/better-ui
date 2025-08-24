import { describe, it, expect, beforeEach } from '@jest/globals';
import aui, { z } from '../index';
import { createRegistry } from '../core/registry';

describe('AUI Comprehensive Tests', () => {
  beforeEach(() => {
    // Clear global registry before each test
    aui.getTools().forEach(tool => {
      // Reset registry
    });
  });

  describe('Ultra-Concise API', () => {
    it('should create tool with .do() one-liner', async () => {
      const tool = aui.do('ping', () => 'pong');
      
      expect(tool.name).toBe('ping');
      const result = await tool.execute({ input: {}, ctx: {} });
      expect(result).toBe('pong');
    });

    it('should support simple tool pattern', async () => {
      const tool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }))
        .build();

      expect(tool.name).toBe('weather');
      const result = await tool.execute({ 
        input: { city: 'Tokyo' }, 
        ctx: {} 
      });
      expect(result).toEqual({ temp: 72, city: 'Tokyo' });
    });

    it('should support shorthand methods', async () => {
      const tool = aui
        .t('calc')
        .i(z.object({ a: z.number(), b: z.number() }))
        .e(({ a, b }) => a + b)
        .b();

      expect(tool.name).toBe('calc');
      const result = await tool.execute({ 
        input: { a: 5, b: 3 }, 
        ctx: {} 
      });
      expect(result).toBe(8);
    });

    it('should support ultra-short single letter aliases', async () => {
      const tool = aui
        .tool('math')
        .i(z.object({ x: z.number() }))
        .e(({ x }) => x * 2)
        .r(result => `Result: ${result}`)
        .b();

      expect(tool.name).toBe('math');
      const result = await tool.execute({ input: { x: 10 }, ctx: {} });
      expect(result).toBe(20);
    });
  });

  describe('Complex Tools', () => {
    it('should support client and server execution', async () => {
      const tool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => {
          return { server: true, query: input.query };
        })
        .clientExecute(async ({ input, ctx }) => {
          return { client: true, query: input.query, cached: ctx.cache?.has(input.query) };
        })
        .build();

      expect(tool.name).toBe('search');
      
      // Test server execution
      const serverResult = await tool.execute({ 
        input: { query: 'test' }, 
        ctx: {} 
      });
      expect(serverResult).toEqual({ server: true, query: 'test' });

      // Test client execution
      if (tool.clientExecute) {
        const cache = new Map();
        const clientResult = await tool.clientExecute({ 
          input: { query: 'test' }, 
          ctx: { cache } 
        });
        expect(clientResult).toEqual({ 
          client: true, 
          query: 'test', 
          cached: false 
        });
      }
    });

    it('should support server-only tools', () => {
      const tool = aui
        .tool('backend')
        .serverOnly()
        .execute(async () => ({ secure: true }))
        .build();

      expect(tool.isServerOnly).toBe(true);
      expect(tool.clientExecute).toBeUndefined();
    });
  });

  describe('AI-Optimized Tools', () => {
    it('should create AI tool with retry logic', async () => {
      let attempts = 0;
      const tool = aui.ai('flaky', {
        execute: async () => {
          attempts++;
          if (attempts < 2) throw new Error('Temporary failure');
          return { success: true, attempts };
        },
        retry: 3
      });

      const result = await tool.execute({ input: {}, ctx: {} });
      expect(result).toEqual({ success: true, attempts: 2 });
    });

    it('should respect retry limit', async () => {
      let attempts = 0;
      const tool = aui.ai('always-fails', {
        execute: async () => {
          attempts++;
          throw new Error('Always fails');
        },
        retry: 2
      });

      await expect(tool.execute({ input: {}, ctx: {} }))
        .rejects.toThrow('Always fails');
      expect(attempts).toBe(2);
    });
  });

  describe('Helper Methods', () => {
    it('should create simple tool', async () => {
      const tool = aui.simple(
        'greet',
        z.object({ name: z.string() }),
        ({ name }) => `Hello, ${name}!`
      );

      const result = await tool.execute({ 
        input: { name: 'World' }, 
        ctx: {} 
      });
      expect(result).toBe('Hello, World!');
    });

    it('should define multiple tools at once', () => {
      const tools = aui.defineTools({
        add: {
          input: z.object({ a: z.number(), b: z.number() }),
          execute: ({ a, b }) => a + b
        },
        multiply: {
          input: z.object({ x: z.number(), y: z.number() }),
          execute: ({ x, y }) => x * y
        }
      });

      expect(tools.add.name).toBe('add');
      expect(tools.multiply.name).toBe('multiply');
    });

    it('should batch create AI tools', () => {
      const tools = aui.aiTools({
        tool1: {
          execute: () => ({ result: 1 }),
          retry: 2
        },
        tool2: {
          execute: () => ({ result: 2 }),
          cache: true
        }
      });

      expect(tools.tool1.metadata?.retry).toBe(2);
      expect(tools.tool2.metadata?.cache).toBe(true);
    });
  });

  describe('Tool Registry', () => {
    it('should register and retrieve tools', () => {
      const tool = aui.tool('test').execute(() => 'test').build();
      aui.register(tool);
      
      const retrieved = aui.getTool('test');
      expect(retrieved).toBe(tool);
    });

    it('should list all registered tools', () => {
      const tool1 = aui.do('tool1', () => 1);
      const tool2 = aui.do('tool2', () => 2);
      
      const tools = aui.getTools();
      expect(tools).toContainEqual(expect.objectContaining({ name: 'tool1' }));
      expect(tools).toContainEqual(expect.objectContaining({ name: 'tool2' }));
    });

    it('should work with custom registry', () => {
      const customRegistry = createRegistry();
      const customAui = new (aui.constructor as any)(customRegistry);
      
      const tool = customAui.do('custom', () => 'custom');
      expect(customAui.getTool('custom')).toBe(tool);
      
      // Should not be in global registry
      expect(aui.getTool('custom')).toBeUndefined();
    });
  });

  describe('Type Safety', () => {
    it('should infer types through builder chain', async () => {
      const tool = aui
        .tool('typed')
        .input(z.object({ 
          name: z.string(),
          age: z.number() 
        }))
        .execute(({ input }) => ({
          message: `${input.name} is ${input.age} years old`
        }))
        .build();

      const result = await tool.execute({
        input: { name: 'Alice', age: 30 },
        ctx: {}
      });
      
      expect(result.message).toBe('Alice is 30 years old');
    });

    it('should validate input schema', async () => {
      const tool = aui
        .tool('validated')
        .input(z.object({ 
          email: z.string().email() 
        }))
        .execute(({ input }) => input.email)
        .build();

      // Valid email
      const validResult = tool.inputSchema?.safeParse({ email: 'test@example.com' });
      expect(validResult?.success).toBe(true);

      // Invalid email
      const invalidResult = tool.inputSchema?.safeParse({ email: 'not-an-email' });
      expect(invalidResult?.success).toBe(false);
    });
  });

  describe('Builder Features', () => {
    it('should support metadata', () => {
      const tool = aui
        .tool('meta')
        .description('A test tool')
        .metadata({ version: '1.0', author: 'test' })
        .execute(() => 'test')
        .build();

      expect(tool.description).toBe('A test tool');
      expect(tool.metadata).toEqual({ version: '1.0', author: 'test' });
    });

    it('should support output schema', () => {
      const tool = aui
        .tool('output')
        .output(z.object({ result: z.string() }))
        .execute(() => ({ result: 'test' }))
        .build();

      expect(tool.outputSchema).toBeDefined();
    });

    it('should support quick mode for auto-building', () => {
      const builder = aui.quick('quick');
      
      // In quick mode, execute and render auto-build
      const result = builder
        .execute(() => 'quick')
        .render(data => data);
      
      // Result should be the built tool, not the builder
      expect(result).toHaveProperty('name', 'quick');
    });

    it('should support handle method for input+execute', async () => {
      const tool = aui
        .tool('handle')
        .handle(
          z.object({ x: z.number() }),
          ({ x }) => x * x
        )
        .build();

      const result = await tool.execute({ 
        input: { x: 5 }, 
        ctx: {} 
      });
      expect(result).toBe(25);
    });

    it('should support define method for all-in-one', async () => {
      const tool = aui
        .tool('define')
        .define(
          z.object({ text: z.string() }),
          ({ text }) => text.toUpperCase(),
          result => `OUTPUT: ${result}`
        );

      expect(tool.name).toBe('define');
      const result = await tool.execute({ 
        input: { text: 'hello' }, 
        ctx: {} 
      });
      expect(result).toBe('HELLO');
    });
  });

  describe('Error Handling', () => {
    it('should throw error if execute is missing', () => {
      expect(() => {
        aui.tool('no-execute').build();
      }).toThrow('Tool "no-execute" must have an execute handler');
    });

    it('should handle async errors in execute', async () => {
      const tool = aui
        .tool('error')
        .execute(async () => {
          throw new Error('Execution failed');
        })
        .build();

      await expect(tool.execute({ input: {}, ctx: {} }))
        .rejects.toThrow('Execution failed');
    });

    it('should provide default render if missing', () => {
      const tool = aui
        .tool('no-render')
        .execute(() => ({ data: 'test' }))
        .build();

      expect(tool.render).toBeDefined();
      const rendered = tool.render({ 
        data: { data: 'test' }, 
        input: {} 
      });
      expect(rendered).toEqual({ data: 'test' });
    });
  });

  describe('Context and State', () => {
    it('should pass context to execute handler', async () => {
      const tool = aui
        .tool('contextual')
        .execute(async ({ ctx }) => {
          return { hasContext: ctx !== undefined };
        })
        .build();

      const result = await tool.execute({ 
        input: {}, 
        ctx: { custom: 'value' } 
      });
      expect(result.hasContext).toBe(true);
    });

    it('should support different execute signatures', async () => {
      // Simple form: (input) => output
      const simple = aui
        .tool('simple-sig')
        .input(z.object({ x: z.number() }))
        .execute((x) => x * 2)
        .build();

      // Destructured form: ({ input }) => output
      const destructured = aui
        .tool('destructured-sig')
        .input(z.object({ x: z.number() }))
        .execute(({ input }) => input.x * 2)
        .build();

      // With context: ({ input, ctx }) => output
      const withContext = aui
        .tool('context-sig')
        .input(z.object({ x: z.number() }))
        .execute(({ input, ctx }) => input.x * (ctx?.multiplier || 1))
        .build();

      const simpleResult = await simple.execute({ 
        input: { x: 5 }, 
        ctx: {} 
      });
      expect(simpleResult).toBe({ x: 5 });

      const destructuredResult = await destructured.execute({ 
        input: { x: 5 }, 
        ctx: {} 
      });
      expect(destructuredResult).toBe(10);

      const contextResult = await withContext.execute({ 
        input: { x: 5 }, 
        ctx: { multiplier: 3 } 
      });
      expect(contextResult).toBe(15);
    });
  });
});