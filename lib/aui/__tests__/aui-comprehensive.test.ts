import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import aui, { AUITool } from '../index';
import { z } from 'zod';

describe('AUI Comprehensive Test Suite', () => {
  beforeEach(() => {
    aui.clear();
  });

  describe('Core API - Concise Pattern', () => {
    it('should create simple tool with just 2 methods', async () => {
      const tool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }));

      expect(tool).toBeInstanceOf(AUITool);
      expect(tool.name).toBe('weather');
      
      const result = await tool.run({ city: 'NYC' });
      expect(result).toEqual({ temp: 72, city: 'NYC' });
    });

    it('should NOT require .build() method', () => {
      const tool = aui
        .tool('test')
        .input(z.object({ value: z.number() }))
        .execute(({ input }) => input.value * 2);

      // Tool is immediately usable
      expect(tool.name).toBe('test');
      expect(tool.run).toBeDefined();
      expect((tool as any).build).toBeUndefined();
    });

    it('should support render method for UI', () => {
      const renderFn = jest.fn(({ data }) => `Rendered: ${data}` as any);
      
      const tool = aui
        .tool('display')
        .input(z.object({ text: z.string() }))
        .execute(({ input }) => input.text)
        .render(renderFn);

      expect(tool.renderer).toBe(renderFn);
    });
  });

  describe('Complex Tools - Client/Server Pattern', () => {
    it('should support both execute and clientExecute', async () => {
      const serverHandler = jest.fn(async ({ input }) => ({ server: true, data: input }));
      const clientHandler = jest.fn(async ({ input }) => ({ client: true, data: input }));

      const tool = aui
        .tool('hybrid')
        .input(z.object({ value: z.string() }))
        .execute(serverHandler)
        .clientExecute(clientHandler);

      // Server context
      const serverResult = await tool.run(
        { value: 'test' },
        { isServer: true, cache: new Map(), fetch: fetch }
      );
      expect(serverHandler).toHaveBeenCalled();
      expect(serverResult).toEqual({ server: true, data: { value: 'test' } });

      // Client context
      const clientResult = await tool.run(
        { value: 'test' },
        { isServer: false, cache: new Map(), fetch: fetch }
      );
      expect(clientHandler).toHaveBeenCalled();
      expect(clientResult).toEqual({ client: true, data: { value: 'test' } });
    });

    it('should support caching in client context', async () => {
      const cache = new Map();
      const fetchMock = jest.fn(async () => ({ json: async () => ({ data: 'fetched' }) }));

      const tool = aui
        .tool('cacheable')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ result: input.query }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.query);
          if (cached) return cached;
          
          const result = await ctx.fetch('/api/search', {
            method: 'POST',
            body: JSON.stringify(input)
          }).then(r => r.json());
          
          ctx.cache.set(input.query, result);
          return result;
        });

      // First call - should fetch
      const result1 = await tool.run(
        { query: 'test' },
        { isServer: false, cache, fetch: fetchMock as any }
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(result1).toEqual({ data: 'fetched' });

      // Second call - should use cache
      const result2 = await tool.run(
        { query: 'test' },
        { isServer: false, cache, fetch: fetchMock as any }
      );
      expect(fetchMock).toHaveBeenCalledTimes(1); // Not called again
      expect(result2).toEqual({ data: 'fetched' });
    });
  });

  describe('AI Control Tools', () => {
    it('should create UI control tool for AI manipulation', async () => {
      const uiTool = aui
        .tool('ui-control')
        .input(z.object({
          action: z.enum(['show', 'hide', 'toggle']),
          selector: z.string()
        }))
        .execute(async ({ input }) => {
          // Mock DOM manipulation
          return { 
            success: true, 
            action: input.action,
            selector: input.selector
          };
        });

      const result = await uiTool.run({
        action: 'toggle',
        selector: '.modal'
      });

      expect(result).toEqual({
        success: true,
        action: 'toggle',
        selector: '.modal'
      });
    });

    it('should create backend control tool for database operations', async () => {
      const dbTool = aui
        .tool('database')
        .input(z.object({
          operation: z.enum(['create', 'read', 'update', 'delete']),
          table: z.string(),
          data: z.any().optional()
        }))
        .execute(async ({ input }) => {
          switch (input.operation) {
            case 'create':
              return { id: '123', ...input.data };
            case 'read':
              return { id: '123', data: {} };
            case 'update':
              return { updated: true };
            case 'delete':
              return { deleted: true };
          }
        });

      const createResult = await dbTool.run({
        operation: 'create',
        table: 'users',
        data: { name: 'John' }
      });

      expect(createResult).toEqual({ id: '123', name: 'John' });
    });

    it('should create form control tool', async () => {
      const formTool = aui
        .tool('form')
        .input(z.object({
          action: z.enum(['submit', 'reset', 'validate']),
          formId: z.string()
        }))
        .clientExecute(async ({ input }) => {
          // Mock form operations
          switch (input.action) {
            case 'submit':
              return { submitted: true, formId: input.formId };
            case 'reset':
              return { reset: true };
            case 'validate':
              return { valid: true };
          }
        });

      const result = await formTool.run(
        { action: 'submit', formId: 'login-form' },
        { isServer: false, cache: new Map(), fetch: fetch }
      );

      expect(result).toEqual({ submitted: true, formId: 'login-form' });
    });
  });

  describe('Tool Registry and Management', () => {
    it('should register and retrieve tools', () => {
      const tool1 = aui.tool('tool1').execute(() => 'result1');
      const tool2 = aui.tool('tool2').execute(() => 'result2');

      expect(aui.has('tool1')).toBe(true);
      expect(aui.has('tool2')).toBe(true);
      expect(aui.get('tool1')).toBe(tool1);
      expect(aui.get('tool2')).toBe(tool2);
    });

    it('should list all tools', () => {
      aui.tool('a').execute(() => 1);
      aui.tool('b').execute(() => 2);
      aui.tool('c').execute(() => 3);

      const tools = aui.list();
      expect(tools).toHaveLength(3);
      expect(aui.getToolNames()).toEqual(['a', 'b', 'c']);
    });

    it('should support tool tags and discovery', () => {
      aui.tool('weather')
        .execute(() => ({}))
        .tag('api', 'external');
      
      aui.tool('database')
        .execute(() => ({}))
        .tag('backend', 'storage');
      
      aui.tool('ui-control')
        .execute(() => ({}))
        .tag('frontend', 'ui');

      const apiTools = aui.findByTag('api');
      expect(apiTools).toHaveLength(1);
      expect(apiTools[0].name).toBe('weather');

      const backendTools = aui.findByTag('backend');
      expect(backendTools).toHaveLength(1);
      expect(backendTools[0].name).toBe('database');
    });

    it('should clear and remove tools', () => {
      aui.tool('temp1').execute(() => 1);
      aui.tool('temp2').execute(() => 2);

      expect(aui.has('temp1')).toBe(true);
      aui.remove('temp1');
      expect(aui.has('temp1')).toBe(false);

      aui.clear();
      expect(aui.list()).toHaveLength(0);
    });
  });

  describe('Middleware Support', () => {
    it('should support middleware chain', async () => {
      const logs: string[] = [];

      const tool = aui
        .tool('logged')
        .input(z.object({ value: z.number() }))
        .middleware(async ({ input, next }) => {
          logs.push('before');
          const result = await next();
          logs.push('after');
          return result;
        })
        .execute(({ input }) => {
          logs.push('execute');
          return input.value * 2;
        });

      const result = await tool.run({ value: 5 });
      
      expect(result).toBe(10);
      expect(logs).toEqual(['before', 'execute', 'after']);
    });

    it('should support multiple middleware', async () => {
      const tool = aui
        .tool('multi-middleware')
        .input(z.object({ value: z.number() }))
        .middleware(async ({ input, next }) => {
          const result = await next();
          return result + 1; // Add 1
        })
        .middleware(async ({ input, next }) => {
          const result = await next();
          return result * 2; // Multiply by 2
        })
        .execute(({ input }) => input.value);

      const result = await tool.run({ value: 5 });
      // Execute returns 5, second middleware doubles to 10, first adds 1 to make 11
      expect(result).toBe(11);
    });
  });

  describe('Error Handling', () => {
    it('should validate input schema', async () => {
      const tool = aui
        .tool('validated')
        .input(z.object({
          email: z.string().email(),
          age: z.number().min(18)
        }))
        .execute(({ input }) => input);

      await expect(tool.run({ email: 'invalid', age: 17 }))
        .rejects.toThrow();

      const valid = await tool.run({ email: 'test@example.com', age: 25 });
      expect(valid).toEqual({ email: 'test@example.com', age: 25 });
    });

    it('should throw error if no execute handler', async () => {
      const tool = aui
        .tool('incomplete')
        .input(z.object({ value: z.string() }));

      await expect(tool.run({ value: 'test' }))
        .rejects.toThrow('Tool incomplete has no execute handler');
    });
  });

  describe('Tool Metadata and Introspection', () => {
    it('should support description and metadata', () => {
      const tool = aui
        .tool('documented')
        .describe('This tool does something important')
        .input(z.object({ param: z.string() }))
        .execute(() => 'result')
        .tag('important', 'documented');

      expect(tool.description).toBe('This tool does something important');
      expect(tool.tags).toContain('important');
      expect(tool.tags).toContain('documented');
    });

    it('should serialize to JSON for discovery', () => {
      const tool = aui
        .tool('serializable')
        .describe('A serializable tool')
        .input(z.object({ x: z.number() }))
        .execute(() => 42)
        .clientExecute(() => 43)
        .render(() => null as any)
        .middleware(async ({ next }) => next())
        .tag('test');

      const json = tool.toJSON();
      
      expect(json).toEqual({
        name: 'serializable',
        description: 'A serializable tool',
        tags: ['test'],
        hasInput: true,
        hasExecute: true,
        hasClientExecute: true,
        hasRender: true,
        hasMiddleware: true
      });
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety through the chain', async () => {
      const tool = aui
        .tool('typed')
        .input(z.object({ 
          str: z.string(),
          num: z.number() 
        }))
        .execute(async ({ input }) => ({
          doubled: input.num * 2,
          upper: input.str.toUpperCase()
        }));

      const result = await tool.run({ str: 'hello', num: 5 });
      
      expect(result.doubled).toBe(10);
      expect(result.upper).toBe('HELLO');
    });
  });
});