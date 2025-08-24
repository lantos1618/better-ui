import { describe, it, expect, beforeEach } from '@jest/globals';
import aui, { z, createTool, type InferToolInput, type InferToolOutput } from '../lantos-aui';

describe('Lantos AUI Enhanced Features', () => {
  beforeEach(() => {
    aui.clear();
  });

  describe('Core API', () => {
    it('should create tools without .build() method', () => {
      const tool = aui.tool('test');
      expect(tool.name).toBe('test');
      expect(typeof tool.execute).toBe('function');
      expect(typeof tool.render).toBe('function');
    });

    it('should support method chaining', () => {
      const tool = aui
        .tool('chainTest')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ result: input.value * 2 }))
        .render(({ data }) => null as any);

      expect(tool.name).toBe('chainTest');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should auto-register tools', () => {
      const tool = aui.tool('autoRegister');
      expect(aui.get('autoRegister')).toBe(tool);
    });
  });

  describe('Shorthand Methods', () => {
    it('should support t() alias for tool()', () => {
      const tool = aui.t('shorthand');
      expect(tool.name).toBe('shorthand');
      expect(aui.get('shorthand')).toBe(tool);
    });

    it('should support do() for simple tools without input', async () => {
      const tool = aui.do('getTime', () => '2024-01-01');
      const result = await tool.run(undefined);
      expect(result).toBe('2024-01-01');
    });

    it('should support doWith() for simple tools with input', async () => {
      const tool = aui.doWith(
        'multiply',
        z.object({ a: z.number(), b: z.number() }),
        ({ a, b }) => a * b
      );
      const result = await tool.run({ a: 3, b: 4 });
      expect(result).toBe(12);
    });

    it('should support simple() for complete simple tools', async () => {
      const tool = aui.simple(
        'greet',
        z.object({ name: z.string() }),
        (input) => `Hello, ${input.name}!`,
        (data) => null as any
      );
      
      const result = await tool.run({ name: 'World' });
      expect(result).toBe('Hello, World!');
    });
  });

  describe('AI-Optimized Tools', () => {
    it('should create AI tools with retry logic', async () => {
      let attempts = 0;
      const tool = aui.ai('retryTest', {
        execute: async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Failed attempt');
          }
          return { success: true };
        },
        retry: 3
      });

      const result = await tool.run(undefined);
      expect(result).toEqual({ success: true });
      expect(attempts).toBe(3);
    });

    it('should support caching in AI tools', async () => {
      let executionCount = 0;
      const tool = aui.ai('cacheTest', {
        input: z.object({ id: z.number() }),
        execute: async ({ input }) => {
          executionCount++;
          return { id: input.id, count: executionCount };
        },
        cache: true
      });

      const ctx = aui.createContext();
      
      // First call
      const result1 = await tool.run({ id: 1 }, ctx);
      expect(result1.count).toBe(1);
      
      // Second call with same input should use cache
      const result2 = await tool.run({ id: 1 }, ctx);
      expect(result2.count).toBe(1); // Should still be 1 due to caching
      
      // Different input should execute again
      const result3 = await tool.run({ id: 2 }, ctx);
      expect(result3.count).toBe(2);
    });
  });

  describe('Batch Tool Definition', () => {
    it('should define multiple tools at once', async () => {
      const tools = aui.defineTools({
        add: {
          input: z.object({ a: z.number(), b: z.number() }),
          execute: ({ input }) => ({ result: input.a + input.b })
        },
        subtract: {
          input: z.object({ a: z.number(), b: z.number() }),
          execute: ({ input }) => ({ result: input.a - input.b })
        }
      });

      expect(tools.add.name).toBe('add');
      expect(tools.subtract.name).toBe('subtract');
      
      const addResult = await tools.add.run({ a: 5, b: 3 });
      expect(addResult).toEqual({ result: 8 });
      
      const subResult = await tools.subtract.run({ a: 5, b: 3 });
      expect(subResult).toEqual({ result: 2 });
    });

    it('should support batch() for simple functions', async () => {
      const tools = aui.batch({
        double: (n: number) => n * 2,
        square: (n: number) => n * n,
        negate: (n: number) => -n
      });

      expect(await tools.double.run(5)).toBe(10);
      expect(await tools.square.run(4)).toBe(16);
      expect(await tools.negate.run(3)).toBe(-3);
    });
  });

  describe('Tool Management', () => {
    it('should register and retrieve tools', () => {
      const tool = createTool('external');
      aui.register(tool);
      expect(aui.get('external')).toBe(tool);
    });

    it('should support chained registration', () => {
      const tool1 = createTool('tool1');
      const tool2 = createTool('tool2');
      
      aui.register(tool1).register(tool2);
      
      expect(aui.get('tool1')).toBe(tool1);
      expect(aui.get('tool2')).toBe(tool2);
    });

    it('should list all tools', () => {
      aui.tool('test1');
      aui.tool('test2');
      aui.tool('test3');
      
      const tools = aui.getTools();
      expect(tools).toHaveLength(3);
      
      const names = aui.getToolNames();
      expect(names).toEqual(['test1', 'test2', 'test3']);
    });

    it('should check tool existence', () => {
      aui.tool('exists');
      expect(aui.has('exists')).toBe(true);
      expect(aui.has('notExists')).toBe(false);
    });

    it('should remove tools', () => {
      aui.tool('toRemove');
      expect(aui.has('toRemove')).toBe(true);
      
      const removed = aui.remove('toRemove');
      expect(removed).toBe(true);
      expect(aui.has('toRemove')).toBe(false);
    });
  });

  describe('Direct Execution', () => {
    it('should execute tools by name', async () => {
      aui.simple(
        'directExec',
        z.object({ value: z.number() }),
        (input) => ({ doubled: input.value * 2 })
      );

      const result = await aui.execute('directExec', { value: 5 });
      expect(result).toEqual({ doubled: 10 });
    });

    it('should throw error for non-existent tools', async () => {
      await expect(aui.execute('nonExistent', {}))
        .rejects
        .toThrow('Tool "nonExistent" not found');
    });
  });

  describe('Context Management', () => {
    it('should create custom contexts', () => {
      const ctx = aui.createContext({
        user: { id: 123 },
        session: 'abc123'
      });

      expect(ctx.cache).toBeInstanceOf(Map);
      expect(ctx.user).toEqual({ id: 123 });
      expect(ctx.session).toBe('abc123');
    });

    it('should use context in tool execution', async () => {
      const tool = aui
        .tool('contextTest')
        .execute(async ({ ctx }) => ({
          hasContext: !!ctx,
          hasCache: !!ctx?.cache,
          user: ctx?.user
        }));

      const ctx = aui.createContext({ user: { name: 'Test' } });
      const result = await tool.run(undefined, ctx);

      expect(result.hasContext).toBe(true);
      expect(result.hasCache).toBe(true);
      expect(result.user).toEqual({ name: 'Test' });
    });
  });

  describe('Type Inference', () => {
    it('should infer input and output types', () => {
      const tool = aui
        .tool('typeTest')
        .input(z.object({ name: z.string(), age: z.number() }))
        .execute(async ({ input }) => ({
          greeting: `Hello ${input.name}, age ${input.age}`
        }));

      type Input = InferToolInput<typeof tool>;
      type Output = InferToolOutput<typeof tool>;

      // These type assertions would fail if inference wasn't working
      const testInput: Input = { name: 'Test', age: 25 };
      const testOutput: Output = { greeting: 'Hello Test, age 25' };

      expect(testInput).toBeDefined();
      expect(testOutput).toBeDefined();
    });
  });

  describe('Client Execution', () => {
    it('should support client execution', async () => {
      const tool = aui
        .tool('clientTest')
        .input(z.object({ id: z.number() }))
        .execute(async ({ input }) => ({ server: input.id }))
        .clientExecute(async ({ input }) => ({ client: input.id * 2 }));

      const ctx = aui.createContext();
      const result = await tool.run({ id: 5 }, ctx);
      
      // Should use client execution when context is provided
      expect(result).toEqual({ client: 10 });
    });
  });

  describe('Rendering', () => {
    it('should support render method', () => {
      const tool = aui
        .tool('renderTest')
        .render(({ data }) => ({ type: 'div', props: { children: data } } as any));

      const rendered = tool.renderResult('Test Data');
      expect(rendered).toEqual({ type: 'div', props: { children: 'Test Data' } });
    });
  });
});