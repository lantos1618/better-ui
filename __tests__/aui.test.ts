import { describe, it, expect, beforeEach } from '@jest/globals';
import aui, { AUI, AUITool } from '../lib/aui';
import { z } from 'zod';

describe('AUI System', () => {
  let testAUI: AUI;

  beforeEach(() => {
    testAUI = new AUI();
  });

  describe('Simple Tool', () => {
    it('should create a simple tool with input, execute, and render', async () => {
      const simpleTool = testAUI
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }));

      const result = await simpleTool.run({ city: 'New York' });
      expect(result).toEqual({ temp: 72, city: 'New York' });
    });

    it('should validate input schema', async () => {
      const tool = testAUI
        .tool('test')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => input.value * 2);

      await expect(tool.run({ value: 'invalid' as any })).rejects.toThrow();
    });
  });

  describe('Complex Tool with Client Execution', () => {
    it('should use client execution when not on server', async () => {
      const searchTool = testAUI
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => {
          return { server: true, query: input.query };
        })
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.query);
          if (cached) return cached;
          
          const result = { client: true, query: input.query };
          ctx.cache.set(input.query, result);
          return result;
        });

      const clientContext = testAUI.createContext({ isServer: false });
      const result = await searchTool.run({ query: 'test' }, clientContext);
      
      expect(result).toEqual({ client: true, query: 'test' });
      expect(clientContext.cache.get('test')).toEqual({ client: true, query: 'test' });
    });

    it('should use cache when available', async () => {
      const tool = testAUI
        .tool('cached')
        .input(z.object({ key: z.string() }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.key);
          if (cached) return cached;
          return { fresh: true, key: input.key };
        });

      const ctx = testAUI.createContext({ isServer: false });
      ctx.cache.set('test', { cached: true });
      
      const result = await tool.run({ key: 'test' }, ctx);
      expect(result).toEqual({ cached: true });
    });
  });

  describe('Tool Management', () => {
    it('should register and retrieve tools', () => {
      const tool1 = testAUI.tool('tool1');
      const tool2 = testAUI.tool('tool2');

      expect(testAUI.get('tool1')).toBe(tool1);
      expect(testAUI.get('tool2')).toBe(tool2);
      expect(testAUI.has('tool1')).toBe(true);
      expect(testAUI.has('nonexistent')).toBe(false);
    });

    it('should list all tools', () => {
      testAUI.tool('a').tag('ui', 'client');
      testAUI.tool('b').tag('server');
      testAUI.tool('c').tag('ui');

      const tools = testAUI.list();
      expect(tools).toHaveLength(3);
      expect(testAUI.getToolNames()).toEqual(['a', 'b', 'c']);
    });

    it('should find tools by tags', () => {
      const uiTool = testAUI.tool('ui-tool').tag('ui', 'frontend');
      const apiTool = testAUI.tool('api-tool').tag('api', 'backend');
      const sharedTool = testAUI.tool('shared').tag('ui', 'api');

      const uiTools = testAUI.findByTag('ui');
      expect(uiTools).toHaveLength(2);
      expect(uiTools).toContain(uiTool);
      expect(uiTools).toContain(sharedTool);

      const multiTagTools = testAUI.findByTags('ui', 'api');
      expect(multiTagTools).toHaveLength(1);
      expect(multiTagTools[0]).toBe(sharedTool);
    });

    it('should remove tools', () => {
      testAUI.tool('temp');
      expect(testAUI.has('temp')).toBe(true);
      
      testAUI.remove('temp');
      expect(testAUI.has('temp')).toBe(false);
    });

    it('should clear all tools', () => {
      testAUI.tool('a');
      testAUI.tool('b');
      expect(testAUI.list()).toHaveLength(2);
      
      testAUI.clear();
      expect(testAUI.list()).toHaveLength(0);
    });
  });

  describe('Middleware', () => {
    it('should apply middleware in sequence', async () => {
      const logs: string[] = [];
      
      const tool = testAUI
        .tool('middleware-test')
        .input(z.object({ value: z.number() }))
        .middleware(async ({ input, next }) => {
          logs.push('middleware1-before');
          const result = await next();
          logs.push('middleware1-after');
          return result;
        })
        .middleware(async ({ input, next }) => {
          logs.push('middleware2-before');
          const result = await next();
          logs.push('middleware2-after');
          return result;
        })
        .execute(async ({ input }) => {
          logs.push('execute');
          return input.value * 2;
        });

      const result = await tool.run({ value: 5 });
      
      expect(result).toBe(10);
      expect(logs).toEqual([
        'middleware1-before',
        'middleware2-before',
        'execute',
        'middleware2-after',
        'middleware1-after'
      ]);
    });
  });

  describe('Tool Metadata', () => {
    it('should handle descriptions and tags', () => {
      const tool = testAUI
        .tool('metadata-test')
        .describe('A test tool')
        .tag('test', 'demo')
        .input(z.object({ test: z.string() }))
        .execute(async () => 'result');

      expect(tool.name).toBe('metadata-test');
      expect(tool.description).toBe('A test tool');
      expect(tool.tags).toEqual(['test', 'demo']);
    });

    it('should serialize to JSON', () => {
      const tool = testAUI
        .tool('json-test')
        .describe('JSON serializable tool')
        .tag('json')
        .input(z.object({ input: z.string() }))
        .execute(async () => 'output')
        .clientExecute(async () => 'client-output')
        .middleware(async ({ next }) => next());

      const json = tool.toJSON();
      
      expect(json).toEqual({
        name: 'json-test',
        description: 'JSON serializable tool',
        tags: ['json'],
        hasInput: true,
        hasExecute: true,
        hasClientExecute: true,
        hasRender: false,
        hasMiddleware: true
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error when execute handler is missing', async () => {
      const tool = testAUI
        .tool('no-execute')
        .input(z.object({ test: z.string() }));

      await expect(tool.run({ test: 'value' })).rejects.toThrow(
        'Tool no-execute has no execute handler'
      );
    });

    it('should handle async errors in execute', async () => {
      const tool = testAUI
        .tool('error-tool')
        .execute(async () => {
          throw new Error('Execution failed');
        });

      await expect(tool.run({})).rejects.toThrow('Execution failed');
    });
  });

  describe('Global AUI Instance', () => {
    it('should use the global aui instance', async () => {
      const weatherTool = aui
        .tool('global-weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 75, city: input.city }));

      const result = await aui.execute('global-weather', { city: 'Paris' });
      expect(result).toEqual({ temp: 75, city: 'Paris' });
    });
  });
});