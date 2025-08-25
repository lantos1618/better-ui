import { describe, it, expect, beforeEach } from '@jest/globals';
import { AUI } from '../index';
import { z } from 'zod';

describe('AUI Simple API', () => {
  let aui: AUI;

  beforeEach(() => {
    aui = new AUI();
  });

  describe('Basic Tool Creation', () => {
    it('should create a simple tool with just execute', async () => {
      const tool = aui
        .tool('simple')
        .execute(async () => ({ result: 'success' }));

      const result = await tool.run({});
      expect(result).toEqual({ result: 'success' });
    });

    it('should create a tool with input validation', async () => {
      const tool = aui
        .tool('validated')
        .input(z.object({ name: z.string() }))
        .execute(async ({ input }) => ({ greeting: `Hello, ${input.name}!` }));

      const result = await tool.run({ name: 'World' });
      expect(result).toEqual({ greeting: 'Hello, World!' });
    });

    it('should throw on invalid input', async () => {
      const tool = aui
        .tool('strict')
        .input(z.object({ age: z.number().min(0) }))
        .execute(async ({ input }) => ({ valid: true, age: input.age }));

      await expect(tool.run({ age: -1 } as any)).rejects.toThrow();
    });
  });

  describe('Client/Server Execution', () => {
    it('should use server execute when on server', async () => {
      const tool = aui
        .tool('dual')
        .execute(async () => ({ from: 'server' }))
        .clientExecute(async () => ({ from: 'client' }));

      const serverCtx = aui.createContext({ isServer: true });
      const result = await tool.run({}, serverCtx);
      expect(result).toEqual({ from: 'server' });
    });

    it('should use client execute when on client', async () => {
      const tool = aui
        .tool('dual')
        .execute(async () => ({ from: 'server' }))
        .clientExecute(async () => ({ from: 'client' }));

      const clientCtx = aui.createContext({ isServer: false });
      const result = await tool.run({}, clientCtx);
      expect(result).toEqual({ from: 'client' });
    });
  });

  describe('Middleware', () => {
    it('should apply middleware in order', async () => {
      const log: string[] = [];
      
      const tool = aui
        .tool('middleware')
        .middleware(async ({ next }) => {
          log.push('before-1');
          const result = await next();
          log.push('after-1');
          return result;
        })
        .middleware(async ({ next }) => {
          log.push('before-2');
          const result = await next();
          log.push('after-2');
          return result;
        })
        .execute(async () => {
          log.push('execute');
          return { done: true };
        });

      await tool.run({});
      expect(log).toEqual(['before-1', 'before-2', 'execute', 'after-2', 'after-1']);
    });

    it('should pass context through middleware', async () => {
      const tool = aui
        .tool('context-test')
        .input(z.object({ value: z.number() }))
        .middleware(async ({ input, ctx, next }) => {
          ctx.cache.set('multiplier', 2);
          return next();
        })
        .execute(async ({ input, ctx }) => {
          const multiplier = ctx?.cache.get('multiplier') || 1;
          return { result: input.value * multiplier };
        });

      const result = await tool.run({ value: 5 });
      expect(result).toEqual({ result: 10 });
    });
  });

  describe('Tool Registry', () => {
    it('should register and retrieve tools', () => {
      const tool1 = aui.tool('tool1').execute(async () => ({}));
      const tool2 = aui.tool('tool2').execute(async () => ({}));

      expect(aui.has('tool1')).toBe(true);
      expect(aui.has('tool2')).toBe(true);
      expect(aui.getToolNames()).toContain('tool1');
      expect(aui.getToolNames()).toContain('tool2');
    });

    it('should support tags', () => {
      const tool1 = aui.tool('tagged1').tag('ai', 'control').execute(async () => ({}));
      const tool2 = aui.tool('tagged2').tag('ai', 'navigation').execute(async () => ({}));
      const tool3 = aui.tool('tagged3').tag('control').execute(async () => ({}));

      const aiTools = aui.findByTag('ai');
      expect(aiTools).toHaveLength(2);
      
      const controlTools = aui.findByTags('ai', 'control');
      expect(controlTools).toHaveLength(1);
      expect(controlTools[0].name).toBe('tagged1');
    });
  });

  describe('Tool Metadata', () => {
    it('should store and retrieve metadata', () => {
      const tool = aui
        .tool('documented')
        .describe('This tool does something important')
        .tag('important', 'documented')
        .input(z.object({ data: z.string() }))
        .execute(async ({ input }) => ({ processed: input.data }));

      expect(tool.name).toBe('documented');
      expect(tool.description).toBe('This tool does something important');
      expect(tool.tags).toEqual(['important', 'documented']);
    });

    it('should serialize to JSON', () => {
      const tool = aui
        .tool('json-tool')
        .describe('JSON serializable tool')
        .input(z.object({ x: z.number() }))
        .execute(async () => ({}))
        .clientExecute(async () => ({}))
        .middleware(async ({ next }) => next());

      const json = tool.toJSON();
      expect(json).toEqual({
        name: 'json-tool',
        description: 'JSON serializable tool',
        tags: [],
        hasInput: true,
        hasExecute: true,
        hasClientExecute: true,
        hasRender: false,
        hasMiddleware: true
      });
    });
  });

  describe('Caching Context', () => {
    it('should cache results in context', async () => {
      let executionCount = 0;
      
      const tool = aui
        .tool('cacheable')
        .input(z.object({ key: z.string() }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.key);
          if (cached) return cached;
          
          executionCount++;
          const result = { value: `computed-${input.key}`, count: executionCount };
          ctx.cache.set(input.key, result);
          return result;
        });

      const ctx = aui.createContext({ isServer: false });
      
      const result1 = await tool.run({ key: 'test' }, ctx);
      const result2 = await tool.run({ key: 'test' }, ctx);
      const result3 = await tool.run({ key: 'other' }, ctx);
      
      expect(result1).toEqual(result2);
      expect(executionCount).toBe(2); // Once for 'test', once for 'other'
    });
  });
});