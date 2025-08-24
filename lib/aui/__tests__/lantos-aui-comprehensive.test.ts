import { describe, it, expect, beforeEach } from '@jest/globals';
import { z } from 'zod';
import aui, { AUITool } from '../lantos';

describe('Lantos AUI Comprehensive Tests', () => {
  beforeEach(() => {
    aui.clear();
  });

  describe('Tool Creation', () => {
    it('should create a simple tool with just execute and input', () => {
      const tool = aui
        .tool('test')
        .input(z.object({ name: z.string() }))
        .execute(async ({ input }) => ({ greeting: `Hello ${input.name}` }));

      expect(tool).toBeInstanceOf(AUITool);
      expect(tool.name).toBe('test');
    });

    it('should create a complex tool with client execution', () => {
      const tool = aui
        .tool('complex')
        .input(z.object({ id: z.number() }))
        .execute(async ({ input }) => ({ data: `Server data for ${input.id}` }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.id);
          if (cached) return cached;
          return { data: `Client data for ${input.id}` };
        });

      expect(tool).toBeInstanceOf(AUITool);
      expect(tool.name).toBe('complex');
    });
  });

  describe('Tool Execution', () => {
    it('should execute a tool with valid input', async () => {
      const tool = aui
        .tool('greet')
        .input(z.object({ name: z.string() }))
        .execute(async ({ input }) => ({ message: `Hello ${input.name}` }));

      const result = await tool.run({ name: 'World' });
      expect(result).toEqual({ message: 'Hello World' });
    });

    it('should validate input schema', async () => {
      const tool = aui
        .tool('validate')
        .input(z.object({ age: z.number().min(0) }))
        .execute(async ({ input }) => ({ valid: true, age: input.age }));

      await expect(tool.run({ age: -1 } as any)).rejects.toThrow();
      
      const result = await tool.run({ age: 25 });
      expect(result).toEqual({ valid: true, age: 25 });
    });

    it('should use client execution when context provided', async () => {
      const tool = aui
        .tool('cached')
        .input(z.object({ key: z.string() }))
        .execute(async ({ input }) => ({ source: 'server', key: input.key }))
        .clientExecute(async ({ input, ctx }) => {
          ctx.cache.set(input.key, 'cached-value');
          return { source: 'client', key: input.key, cached: true };
        });

      const ctx = aui.createContext();
      const result = await tool.run({ key: 'test' }, ctx);
      
      expect(result).toEqual({ source: 'client', key: 'test', cached: true });
      expect(ctx.cache.get('test')).toBe('cached-value');
    });

    it('should handle async execution', async () => {
      const tool = aui
        .tool('async')
        .input(z.object({ delay: z.number() }))
        .execute(async ({ input }) => {
          await new Promise(r => setTimeout(r, input.delay));
          return { completed: true, delay: input.delay };
        });

      const start = Date.now();
      const result = await tool.run({ delay: 100 });
      const elapsed = Date.now() - start;
      
      expect(result).toEqual({ completed: true, delay: 100 });
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Tool Registry', () => {
    it('should register and retrieve tools', () => {
      const tool1 = aui.tool('tool1').execute(async () => ({ id: 1 }));
      const tool2 = aui.tool('tool2').execute(async () => ({ id: 2 }));

      expect(aui.has('tool1')).toBe(true);
      expect(aui.has('tool2')).toBe(true);
      expect(aui.get('tool1')).toBe(tool1);
      expect(aui.get('tool2')).toBe(tool2);
    });

    it('should list all tool names', () => {
      aui.tool('a').execute(async () => ({}));
      aui.tool('b').execute(async () => ({}));
      aui.tool('c').execute(async () => ({}));

      const names = aui.getToolNames();
      expect(names).toContain('a');
      expect(names).toContain('b');
      expect(names).toContain('c');
      expect(names).toHaveLength(3);
    });

    it('should clear all tools', () => {
      aui.tool('test1').execute(async () => ({}));
      aui.tool('test2').execute(async () => ({}));
      
      expect(aui.getTools()).toHaveLength(2);
      
      aui.clear();
      
      expect(aui.getTools()).toHaveLength(0);
    });

    it('should remove individual tools', () => {
      aui.tool('keep').execute(async () => ({}));
      aui.tool('remove').execute(async () => ({}));
      
      expect(aui.has('keep')).toBe(true);
      expect(aui.has('remove')).toBe(true);
      
      const removed = aui.remove('remove');
      
      expect(removed).toBe(true);
      expect(aui.has('keep')).toBe(true);
      expect(aui.has('remove')).toBe(false);
    });
  });

  describe('Context Management', () => {
    it('should create context with defaults', () => {
      const ctx = aui.createContext();
      
      expect(ctx.cache).toBeInstanceOf(Map);
      expect(ctx.fetch).toBeDefined();
      expect(ctx.user).toBeUndefined();
      expect(ctx.session).toBeUndefined();
    });

    it('should create context with additions', () => {
      const ctx = aui.createContext({
        user: { id: 123, name: 'Test' },
        session: 'session-123',
      });
      
      expect(ctx.user).toEqual({ id: 123, name: 'Test' });
      expect(ctx.session).toBe('session-123');
    });

    it('should share cache across tool executions', async () => {
      const tool1 = aui
        .tool('writer')
        .input(z.object({ key: z.string(), value: z.any() }))
        .execute(async ({ input, ctx }) => {
          ctx?.cache.set(input.key, input.value);
          return { written: true };
        });

      const tool2 = aui
        .tool('reader')
        .input(z.object({ key: z.string() }))
        .execute(async ({ input, ctx }) => {
          return { value: ctx?.cache.get(input.key) };
        });

      const ctx = aui.createContext();
      
      await tool1.run({ key: 'shared', value: 'test-data' }, ctx);
      const result = await tool2.run({ key: 'shared' }, ctx);
      
      expect(result.value).toBe('test-data');
    });
  });

  describe('Execute Method', () => {
    it('should execute tool by name', async () => {
      aui
        .tool('named')
        .input(z.object({ x: z.number() }))
        .execute(async ({ input }) => ({ result: input.x * 2 }));

      const result = await aui.execute('named', { x: 5 });
      expect(result).toEqual({ result: 10 });
    });

    it('should throw error for non-existent tool', async () => {
      await expect(aui.execute('non-existent', {})).rejects.toThrow('Tool "non-existent" not found');
    });

    it('should use provided context', async () => {
      aui
        .tool('ctx-test')
        .input(z.object({ key: z.string() }))
        .execute(async ({ input, ctx }) => ({
          hasCache: ctx?.cache instanceof Map,
          cacheSize: ctx?.cache.size || 0,
        }));

      const ctx = aui.createContext();
      ctx.cache.set('existing', 'value');
      
      const result = await aui.execute('ctx-test', { key: 'test' }, ctx);
      expect(result).toEqual({ hasCache: true, cacheSize: 1 });
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle tool chaining', async () => {
      const fetchTool = aui
        .tool('fetch')
        .input(z.object({ url: z.string() }))
        .execute(async ({ input }) => ({ 
          data: `Data from ${input.url}`,
          timestamp: Date.now() 
        }));

      const processTool = aui
        .tool('process')
        .input(z.object({ data: z.string() }))
        .execute(async ({ input }) => ({ 
          processed: input.data.toUpperCase(),
          length: input.data.length 
        }));

      const fetchResult = await fetchTool.run({ url: 'https://api.example.com' });
      const processResult = await processTool.run({ data: fetchResult.data });
      
      expect(processResult.processed).toBe('DATA FROM HTTPS://API.EXAMPLE.COM');
      expect(processResult.length).toBeGreaterThan(0);
    });

    it('should handle error propagation', async () => {
      const errorTool = aui
        .tool('error')
        .input(z.object({ shouldFail: z.boolean() }))
        .execute(async ({ input }) => {
          if (input.shouldFail) {
            throw new Error('Intentional failure');
          }
          return { success: true };
        });

      await expect(errorTool.run({ shouldFail: true })).rejects.toThrow('Intentional failure');
      
      const result = await errorTool.run({ shouldFail: false });
      expect(result).toEqual({ success: true });
    });

    it('should support type inference', async () => {
      const typedTool = aui
        .tool('typed')
        .input(z.object({ 
          name: z.string(),
          age: z.number(),
          active: z.boolean() 
        }))
        .execute(async ({ input }) => ({
          summary: `${input.name} is ${input.age} years old`,
          status: input.active ? 'active' : 'inactive'
        }));

      const result = await typedTool.run({ 
        name: 'John',
        age: 30,
        active: true 
      });

      expect(result.summary).toBe('John is 30 years old');
      expect(result.status).toBe('active');
    });
  });
});