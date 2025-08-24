import { z } from 'zod';
import aui, { Tool } from '../lantos-aui';

describe('Lantos AUI - Complete Test Suite', () => {
  beforeEach(() => {
    aui.clear();
  });

  describe('Core Tool Creation', () => {
    it('should create a simple tool without .build()', () => {
      const tool = aui
        .tool('test')
        .input(z.object({ value: z.string() }))
        .execute(async ({ input }) => input.value.toUpperCase());

      expect(tool.name).toBe('test');
      expect(tool).toBeInstanceOf(Tool);
    });

    it('should auto-register tools', () => {
      const tool = aui.tool('registered');
      const retrieved = aui.get('registered');
      expect(retrieved).toBe(tool);
    });

    it('should execute tools with validated input', async () => {
      const tool = aui
        .tool('validator')
        .input(z.object({ 
          email: z.string().email(),
          age: z.number().min(0) 
        }))
        .execute(async ({ input }) => ({
          valid: true,
          email: input.email,
          age: input.age
        }));

      const result = await tool.run({ 
        email: 'test@example.com', 
        age: 25 
      });

      expect(result).toEqual({
        valid: true,
        email: 'test@example.com',
        age: 25
      });

      // Should throw on invalid input
      await expect(tool.run({ 
        email: 'invalid', 
        age: 25 
      })).rejects.toThrow();
    });
  });

  describe('Helper Methods', () => {
    it('should create one-liner tools with .do()', async () => {
      const tool = aui.do('ping', () => 'pong');
      const result = await tool.run(undefined);
      expect(result).toBe('pong');
    });

    it('should create simple tools with all basics', async () => {
      const tool = aui.simple(
        'greet',
        z.object({ name: z.string() }),
        (input) => `Hello, ${input.name}!`,
        (message) => ({ rendered: message } as any)
      );

      const result = await tool.run({ name: 'World' });
      expect(result).toBe('Hello, World!');
    });

    it('should create AI-optimized tools with retry', async () => {
      let attempts = 0;
      const tool = aui.ai('flaky', {
        input: z.object({ value: z.number() }),
        execute: async ({ input }) => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Temporary failure');
          }
          return input.value * 2;
        },
        retry: 3
      });

      const result = await tool.run({ value: 5 });
      expect(result).toBe(10);
      expect(attempts).toBe(3);
    });

    it('should cache results for AI tools', async () => {
      let executeCount = 0;
      
      const tool = aui.ai('cached', {
        input: z.object({ key: z.string() }),
        execute: async ({ input }) => {
          executeCount++;
          return `Result for ${input.key}`;
        },
        cache: true
      });

      const ctx = {
        cache: new Map(),
        fetch: jest.fn()
      };

      // First call - should execute and cache
      const result1 = await tool.run({ key: 'test' }, ctx);
      expect(result1).toBe('Result for test');
      
      // Second call with same key should use cache (clientExecute handles caching)
      const result2 = await tool.run({ key: 'test' }, ctx);
      expect(result2).toBe('Result for test');
      
      // Different key should execute again
      const result3 = await tool.run({ key: 'other' }, ctx);
      expect(result3).toBe('Result for other');
      
      // Verify cache was used (checking the cache directly)
      const cacheKey = JSON.stringify({ name: 'cached', input: { key: 'test' } });
      expect(ctx.cache.has(cacheKey)).toBe(true);
    });

    it('should define multiple tools at once', () => {
      const tools = aui.defineTools({
        add: {
          input: z.object({ a: z.number(), b: z.number() }),
          execute: ({ input }) => input.a + input.b
        },
        multiply: {
          input: z.object({ a: z.number(), b: z.number() }),
          execute: ({ input }) => input.a * input.b
        }
      });

      expect(tools.add).toBeInstanceOf(Tool);
      expect(tools.multiply).toBeInstanceOf(Tool);
      expect(aui.get('add')).toBe(tools.add);
      expect(aui.get('multiply')).toBe(tools.multiply);
    });
  });

  describe('Client/Server Execution', () => {
    it('should use client execution when available', async () => {
      const serverCalled = jest.fn();
      const clientCalled = jest.fn();

      const tool = aui
        .tool('dual')
        .input(z.object({ value: z.string() }))
        .execute(async ({ input }) => {
          serverCalled();
          return `server: ${input.value}`;
        })
        .clientExecute(async ({ input }) => {
          clientCalled();
          return `client: ${input.value}`;
        });

      const ctx = {
        cache: new Map(),
        fetch: jest.fn()
      };

      // With context, should use client execution
      const result = await tool.run({ value: 'test' }, ctx);
      expect(result).toBe('client: test');
      expect(clientCalled).toHaveBeenCalled();
      expect(serverCalled).not.toHaveBeenCalled();

      // Without context, should use server execution
      const serverResult = await tool.run({ value: 'test' });
      expect(serverResult).toBe('server: test');
      expect(serverCalled).toHaveBeenCalled();
    });
  });

  describe('Tool Registry', () => {
    it('should list all registered tools', () => {
      aui.tool('tool1');
      aui.tool('tool2');
      aui.tool('tool3');

      const tools = aui.getTools();
      expect(tools).toHaveLength(3);
      expect(tools.map(t => t.name)).toContain('tool1');
      expect(tools.map(t => t.name)).toContain('tool2');
      expect(tools.map(t => t.name)).toContain('tool3');
    });

    it('should clear all tools', () => {
      aui.tool('temp1');
      aui.tool('temp2');
      expect(aui.getTools()).toHaveLength(2);

      aui.clear();
      expect(aui.getTools()).toHaveLength(0);
    });

    it('should manually register external tools', () => {
      const externalTool = new Tool('external');
      aui.register(externalTool);
      
      expect(aui.get('external')).toBe(externalTool);
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety through the chain', async () => {
      const tool = aui
        .tool('typed')
        .input(z.object({ 
          count: z.number(),
          message: z.string() 
        }))
        .execute(async ({ input }) => ({
          result: `${input.message} x ${input.count}`,
          total: input.count
        }));

      const result = await tool.run({ count: 5, message: 'Hello' });
      
      // TypeScript should infer these types correctly
      expect(result.result).toBe('Hello x 5');
      expect(result.total).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle execution errors', async () => {
      const tool = aui
        .tool('error')
        .execute(async () => {
          throw new Error('Execution failed');
        });

      await expect(tool.run(undefined)).rejects.toThrow('Execution failed');
    });

    it('should handle validation errors', async () => {
      const tool = aui
        .tool('strict')
        .input(z.object({ 
          required: z.string().min(1) 
        }))
        .execute(async ({ input }) => input.required);

      await expect(tool.run({ required: '' })).rejects.toThrow();
    });
  });

  describe('Render Methods', () => {
    it('should render results', () => {
      const tool = aui
        .tool('renderer')
        .execute(async () => ({ value: 42 }))
        .render(({ data }) => ({ type: 'div', props: { children: data.value } } as any));

      const rendered = tool.renderResult({ value: 42 });
      expect(rendered).toEqual({ 
        type: 'div', 
        props: { children: 42 } 
      });
    });

    it('should return null when no render method', () => {
      const tool = aui
        .tool('norender')
        .execute(async () => 'result');

      const rendered = tool.renderResult('result');
      expect(rendered).toBeNull();
    });
  });

  describe('Tool Definition Export', () => {
    it('should export tool definition', () => {
      const tool = aui
        .tool('exportable')
        .input(z.object({ id: z.number() }))
        .execute(async ({ input }) => input.id * 2);

      const definition = tool.toDefinition();
      expect(definition.name).toBe('exportable');
      expect(definition.inputSchema).toBeDefined();
      expect(definition.execute).toBeDefined();
    });
  });

  describe('Shorthand Methods', () => {
    it('should support t() shorthand for tool()', () => {
      const tool = aui.t('shorthand');
      expect(tool.name).toBe('shorthand');
      expect(aui.get('shorthand')).toBe(tool);
    });
  });
});