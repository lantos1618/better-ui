import { describe, it, expect, beforeEach } from '@jest/globals';
import aui from '../lib/aui';
import { z } from 'zod';
import { globalRegistry } from '../lib/aui/core/registry';

describe('Ultra-Concise AUI API', () => {
  beforeEach(() => {
    // Clear registry before each test
    globalRegistry.clear();
  });

  describe('Basic Tool Creation', () => {
    it('should create a simple tool with minimal syntax', () => {
      const tool = aui
        .tool('test')
        .input(z.object({ name: z.string() }))
        .execute(async ({ input }) => `Hello, ${input.name}!`)
        .build();

      expect(tool.name).toBe('test');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
    });

    it('should create tool with .simple() helper', () => {
      const tool = aui.simple(
        'weather',
        z.object({ city: z.string() }),
        async (input) => ({ temp: 72, city: input.city })
      );

      expect(tool.name).toBe('weather');
      expect(tool.execute).toBeDefined();
    });

    it('should create tool with .do() method', () => {
      const tool = aui.tool('calc').do({
        input: z.object({ a: z.number(), b: z.number() }),
        execute: (input) => input.a + input.b
      });

      expect(tool.name).toBe('calc');
      expect(tool.inputSchema).toBeDefined();
    });
  });

  describe('Tool Execution', () => {
    it('should execute a simple tool', async () => {
      const tool = aui.simple(
        'echo',
        z.object({ message: z.string() }),
        async (input) => input.message
      );

      const result = await tool.execute({
        input: { message: 'Hello' },
        ctx: { cache: new Map(), fetch: async () => ({}), userId: 'test' }
      });

      expect(result).toBe('Hello');
    });

    it('should validate input schema', () => {
      const tool = aui.simple(
        'typed',
        z.object({ 
          age: z.number().min(0).max(120),
          name: z.string().min(1)
        }),
        async (input) => `${input.name} is ${input.age} years old`
      );

      expect(() => {
        tool.inputSchema?.parse({ age: -5, name: 'John' });
      }).toThrow();

      expect(() => {
        tool.inputSchema?.parse({ age: 25, name: '' });
      }).toThrow();

      expect(() => {
        tool.inputSchema?.parse({ age: 25, name: 'John' });
      }).not.toThrow();
    });
  });

  describe('Client Execution', () => {
    it('should support client-side execution', async () => {
      const tool = aui
        .tool('data')
        .input(z.object({ id: z.string() }))
        .execute(async ({ input }) => ({ id: input.id, server: true }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.id);
          return cached || { id: input.id, client: true };
        })
        .build();

      expect(tool.clientExecute).toBeDefined();
      expect(tool.isServerOnly).toBe(false);
    });

    it('should create server-only tools', () => {
      const tool = aui.server(
        'db-write',
        z.object({ data: z.any() }),
        async (input) => ({ success: true })
      );

      expect(tool.isServerOnly).toBe(true);
    });
  });

  describe('Batch Operations', () => {
    it('should create multiple tools at once', () => {
      const tools = aui.defineTools({
        tool1: {
          input: z.object({ x: z.number() }),
          execute: async (input) => input.x * 2
        },
        tool2: {
          input: z.object({ y: z.string() }),
          execute: async (input) => input.y.toUpperCase()
        }
      });

      expect(tools.tool1.name).toBe('tool1');
      expect(tools.tool2.name).toBe('tool2');
      expect(globalRegistry.get('tool1')).toBeDefined();
      expect(globalRegistry.get('tool2')).toBeDefined();
    });

    it('should create AI-optimized tools', () => {
      const tools = aui.aiTools({
        generate: {
          input: z.object({ prompt: z.string() }),
          execute: async (input) => `Generated: ${input.prompt}`,
          retry: 3,
          cache: true
        }
      });

      expect(tools.generate.metadata?.aiOptimized).toBe(true);
      expect(tools.generate.metadata?.retry).toBe(3);
      expect(tools.generate.metadata?.cache).toBe(true);
    });
  });

  describe('Ultra-Concise Shortcuts', () => {
    it('should support single-character aliases', () => {
      const tool = aui.t('quick')
        .i(z.object({ x: z.number() }))
        .e((input) => input.x * 2)
        .b();

      expect(tool.name).toBe('quick');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
    });

    it('should support .run() shorthand', async () => {
      const tool = aui
        .tool('run-test')
        .run(
          (input: { value: number }) => input.value * 3,
          (result) => `Result: ${result}`
        )
        .build();

      const result = await tool.execute({
        input: { value: 5 },
        ctx: { cache: new Map(), fetch: async () => ({}), userId: 'test' }
      });

      expect(result).toBe(15);
    });

    it('should support .handle() shorthand', () => {
      const tool = aui
        .tool('handle-test')
        .handle(
          z.object({ msg: z.string() }),
          (input) => `Handled: ${input.msg}`
        )
        .build();

      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
    });
  });

  describe('Context Support', () => {
    it('should create contextual tools', async () => {
      const tool = aui.contextual(
        'user-tool',
        z.object({ action: z.string() }),
        async ({ input, ctx }) => ({
          action: input.action,
          userId: ctx.userId || 'anonymous'
        })
      );

      const result = await tool.execute({
        input: { action: 'test' },
        ctx: { 
          cache: new Map(), 
          fetch: async () => ({}), 
          userId: 'user123' 
        }
      });

      expect(result).toEqual({
        action: 'test',
        userId: 'user123'
      });
    });
  });

  describe('Quick Mode', () => {
    it('should auto-build with quick mode', () => {
      const tool = aui
        .quick('auto')
        .input(z.object({ x: z.number() }))
        .execute((input) => input.x * 2)
        .render((data) => `Value: ${data}`);

      // Quick mode should auto-build, so tool should be a ToolDefinition
      expect(tool.name).toBe('auto');
      expect(tool.execute).toBeDefined();
      expect(tool.render).toBeDefined();
    });
  });
});