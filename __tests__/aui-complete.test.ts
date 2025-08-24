import { describe, it, expect, beforeEach } from '@jest/globals';
import React from 'react';
import aui, { z, createTool, Tool } from '@/lib/aui/lantos-aui';

describe('AUI Complete System', () => {
  beforeEach(() => {
    aui.clear();
  });

  describe('Core Tool Creation', () => {
    it('should create a simple tool with just execute and render', () => {
      const tool = aui
        .tool('simple')
        .input(z.object({ name: z.string() }))
        .execute(async ({ input }) => ({ greeting: `Hello, ${input.name}!` }))
        .render(({ data }) => React.createElement('div', null, data.greeting));

      expect(tool.name).toBe('simple');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should create a complex tool with client execution', () => {
      const tool = aui
        .tool('complex')
        .input(z.object({ id: z.number() }))
        .execute(async ({ input }) => ({ id: input.id, data: 'server' }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.id);
          return cached || { id: input.id, data: 'client' };
        })
        .render(({ data }) => React.createElement('div', null, data.data));

      expect(tool.name).toBe('complex');
    });

    it('should run a tool and get results', async () => {
      const tool = aui
        .tool('calculator')
        .input(z.object({ a: z.number(), b: z.number() }))
        .execute(({ input }) => ({ result: input.a + input.b }));

      const result = await tool.run({ a: 5, b: 3 });
      expect(result.result).toBe(8);
    });

    it('should validate input with zod schema', async () => {
      const tool = aui
        .tool('validated')
        .input(z.object({ 
          email: z.string().email(),
          age: z.number().min(0).max(120)
        }))
        .execute(({ input }) => input);

      await expect(
        tool.run({ email: 'invalid', age: 25 })
      ).rejects.toThrow();

      const result = await tool.run({ email: 'test@example.com', age: 25 });
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('Shorthand Methods', () => {
    it('should create tool with t() shorthand', () => {
      const tool = aui.t('short')
        .execute(() => ({ success: true }));
      
      expect(tool.name).toBe('short');
    });

    it('should create simple tool with do()', async () => {
      const tool = aui.do('action', () => 'done');
      const result = await tool.run(undefined);
      expect(result).toBe('done');
    });

    it('should create tool with input using doWith()', async () => {
      const tool = aui.doWith(
        'multiply',
        z.object({ x: z.number(), y: z.number() }),
        (input) => input.x * input.y
      );
      
      const result = await tool.run({ x: 4, y: 5 });
      expect(result).toBe(20);
    });

    it('should create simple tool with all basics', async () => {
      const tool = aui.simple(
        'greet',
        z.object({ name: z.string() }),
        (input) => `Hello, ${input.name}!`,
        (data) => React.createElement('span', null, data)
      );

      const result = await tool.run({ name: 'World' });
      expect(result).toBe('Hello, World!');
    });

    it('should create AI-optimized tool with retry and cache', async () => {
      let attempts = 0;
      const tool = aui.ai('flaky', {
        input: z.object({ value: z.number() }),
        execute: async ({ input }) => {
          attempts++;
          if (attempts < 2) {
            throw new Error('Temporary failure');
          }
          return { value: input.value * 2 };
        },
        retry: 3,
        cache: true
      });

      const result = await tool.run({ value: 5 });
      expect(result.value).toBe(10);
      expect(attempts).toBe(2);
    });
  });

  describe('Batch Operations', () => {
    it('should define multiple tools at once', () => {
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
    });

    it('should batch create simple tools', async () => {
      const tools = aui.batch({
        double: (x: number) => x * 2,
        triple: (x: number) => x * 3,
        square: (x: number) => x * x
      });

      const double = await tools.double.run(5);
      const triple = await tools.triple.run(5);
      const square = await tools.square.run(5);

      expect(double).toBe(10);
      expect(triple).toBe(15);
      expect(square).toBe(25);
    });
  });

  describe('Tool Registry', () => {
    it('should register and retrieve tools', () => {
      const tool = aui.tool('registered')
        .execute(() => ({ ok: true }));

      expect(aui.has('registered')).toBe(true);
      expect(aui.get('registered')).toBe(tool);
    });

    it('should register external tools', () => {
      const external = createTool('external')
        .execute(() => ({ external: true }));

      aui.register(external);
      expect(aui.has('external')).toBe(true);
    });

    it('should register multiple tools', () => {
      const tool1 = createTool('tool1').execute(() => 1);
      const tool2 = createTool('tool2').execute(() => 2);
      
      aui.registerAll(tool1, tool2);
      
      expect(aui.has('tool1')).toBe(true);
      expect(aui.has('tool2')).toBe(true);
    });

    it('should list all registered tools', () => {
      aui.tool('a').execute(() => 'a');
      aui.tool('b').execute(() => 'b');
      aui.tool('c').execute(() => 'c');

      const names = aui.getToolNames();
      expect(names).toContain('a');
      expect(names).toContain('b');
      expect(names).toContain('c');
      expect(names.length).toBe(3);
    });

    it('should execute tool by name', async () => {
      aui.tool('exec')
        .input(z.object({ value: z.number() }))
        .execute(({ input }) => ({ doubled: input.value * 2 }));

      const result = await aui.execute('exec', { value: 7 });
      expect(result.doubled).toBe(14);
    });

    it('should remove tools', () => {
      aui.tool('temp').execute(() => 'temp');
      expect(aui.has('temp')).toBe(true);
      
      aui.remove('temp');
      expect(aui.has('temp')).toBe(false);
    });

    it('should clear all tools', () => {
      aui.tool('x').execute(() => 'x');
      aui.tool('y').execute(() => 'y');
      
      aui.clear();
      expect(aui.getToolNames().length).toBe(0);
    });
  });

  describe('Context Management', () => {
    it('should create context with custom additions', () => {
      const ctx = aui.createContext({
        user: { id: 1, name: 'Test User' },
        session: { token: 'abc123' }
      });

      expect(ctx.user).toEqual({ id: 1, name: 'Test User' });
      expect(ctx.session).toEqual({ token: 'abc123' });
      expect(ctx.cache).toBeDefined();
      expect(ctx.fetch).toBeDefined();
    });

    it('should use client execution when context provided', async () => {
      let executionPath = '';
      
      const tool = aui.tool('contextual')
        .execute(() => {
          executionPath = 'server';
          return { path: 'server' };
        })
        .clientExecute(() => {
          executionPath = 'client';
          return { path: 'client' };
        });

      const ctx = aui.createContext();
      const result = await tool.run({}, ctx);
      
      expect(executionPath).toBe('client');
      expect(result.path).toBe('client');
    });

    it('should cache results in context', async () => {
      const ctx = aui.createContext();
      let callCount = 0;

      const tool = aui.tool('cacheable')
        .input(z.object({ key: z.string() }))
        .clientExecute(({ input, ctx }) => {
          const cacheKey = `cache:${input.key}`;
          const cached = ctx.cache.get(cacheKey);
          
          if (cached) return cached;
          
          callCount++;
          const result = { value: `computed-${input.key}`, count: callCount };
          ctx.cache.set(cacheKey, result);
          return result;
        });

      const result1 = await tool.run({ key: 'test' }, ctx);
      const result2 = await tool.run({ key: 'test' }, ctx);
      
      expect(result1).toBe(result2);
      expect(callCount).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent tool', async () => {
      await expect(
        aui.execute('nonexistent', {})
      ).rejects.toThrow('Tool "nonexistent" not found');
    });

    it('should handle async errors in execute', async () => {
      const tool = aui.tool('error')
        .execute(async () => {
          throw new Error('Execution failed');
        });

      await expect(
        tool.run({})
      ).rejects.toThrow('Execution failed');
    });

    it('should retry on failure for AI tools', async () => {
      let attempts = 0;
      
      const tool = aui.ai('retry-test', {
        execute: async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error(`Attempt ${attempts} failed`);
          }
          return { success: true, attempts };
        },
        retry: 3
      });

      const result = await tool.run({});
      expect(result.success).toBe(true);
      expect(result.attempts).toBe(3);
    });
  });

  describe('Type Inference', () => {
    it('should infer types correctly', async () => {
      const tool = aui
        .tool('typed')
        .input(z.object({ 
          name: z.string(),
          age: z.number()
        }))
        .execute(({ input }) => ({
          message: `${input.name} is ${input.age} years old`,
          isAdult: input.age >= 18
        }));

      const result = await tool.run({ name: 'Alice', age: 25 });
      
      expect(result.message).toBe('Alice is 25 years old');
      expect(result.isAdult).toBe(true);
    });
  });

  describe('Rendering', () => {
    it('should render result when data available', () => {
      const tool = aui
        .tool('renderable')
        .execute(() => ({ text: 'Hello' }))
        .render(({ data }) => React.createElement('div', null, data.text));

      const element = tool.renderResult({ text: 'Hello' });
      expect(element).toBeDefined();
      expect(element?.type).toBe('div');
    });

    it('should return null when no render function', () => {
      const tool = aui
        .tool('norender')
        .execute(() => ({ value: 42 }));

      const element = tool.renderResult({ value: 42 });
      expect(element).toBeNull();
    });
  });
});