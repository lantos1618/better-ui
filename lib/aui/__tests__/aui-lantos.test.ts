import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import aui, { z } from '../index';
import { createRegistry } from '../core/registry';

describe('AUI Lantos - Concise API Tests', () => {
  let registry: ReturnType<typeof createRegistry>;

  beforeEach(() => {
    registry = createRegistry();
  });

  describe('Simple Tool Pattern', () => {
    it('should create a simple tool with just execute and render', () => {
      const simpleTool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }))
        .render(({ data }) => React.createElement('div', {}, `${data.city}: ${data.temp}°`))
        .build();

      expect(simpleTool.name).toBe('weather');
      expect(simpleTool.inputSchema).toBeDefined();
      expect(simpleTool.execute).toBeDefined();
      expect(simpleTool.render).toBeDefined();
    });

    it('should execute simple tool correctly', async () => {
      const simpleTool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }))
        .build();

      const result = await simpleTool.execute({ 
        input: { city: 'San Francisco' } 
      });

      expect(result).toEqual({ temp: 72, city: 'San Francisco' });
    });
  });

  describe('Complex Tool Pattern', () => {
    it('should create a complex tool with client execution', () => {
      const complexTool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => {
          return [{ id: 1, title: `Result for ${input.query}` }];
        })
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.query);
          return cached || [];
        })
        .render(({ data }) => React.createElement('div', {}, 'Results'))
        .build();

      expect(complexTool.name).toBe('search');
      expect(complexTool.execute).toBeDefined();
      expect(complexTool.clientExecute).toBeDefined();
      expect(complexTool.render).toBeDefined();
      expect(complexTool.isServerOnly).toBe(false);
    });

    it('should handle client execution with caching', async () => {
      const cache = new Map();
      cache.set('test', [{ id: 1, title: 'Cached result' }]);

      const complexTool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => {
          return [{ id: 2, title: 'Server result' }];
        })
        .clientExecute(async ({ input, ctx }) => {
          return ctx.cache.get(input.query) || [];
        })
        .build();

      const result = await complexTool.clientExecute!({
        input: { query: 'test' },
        ctx: { cache, fetch: globalThis.fetch }
      });

      expect(result).toEqual([{ id: 1, title: 'Cached result' }]);
    });
  });

  describe('Ultra-Concise Methods', () => {
    it('should support t() shorthand', () => {
      const tool = aui.t('test')
        .input(z.object({ text: z.string() }))
        .execute(async ({ input }) => input.text.toUpperCase())
        .build();

      expect(tool.name).toBe('test');
    });

    it('should support do() for one-liner creation', () => {
      const tool = aui
        .tool('simple')
        .do(async (input: { text: string }) => input.text.toUpperCase());

      expect(tool.name).toBe('simple');
      expect(tool.execute).toBeDefined();
    });

    it('should support do() with object config', () => {
      const tool = aui
        .tool('configured')
        .do({
          input: z.object({ text: z.string() }),
          execute: async (input) => input.text.toUpperCase(),
          render: (data) => React.createElement('div', {}, data)
        });

      expect(tool.name).toBe('configured');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
      expect(tool.render).toBeDefined();
    });

    it('should support simple() helper', () => {
      const tool = aui.simple(
        'timestamp',
        z.object({ format: z.enum(['iso', 'unix']) }),
        (input) => {
          const now = new Date();
          return input.format === 'iso' ? now.toISOString() : now.getTime();
        }
      );

      expect(tool.name).toBe('timestamp');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
    });

    it('should support create() helper', () => {
      const tool = aui.create('test', {
        input: z.object({ value: z.number() }),
        execute: async (input) => input.value * 2,
        render: (data) => React.createElement('div', {}, data)
      });

      expect(tool.name).toBe('test');
      expect(registry.get('test')).toBeDefined();
    });
  });

  describe('AI-Optimized Features', () => {
    it('should support ai() method with retry logic', async () => {
      let attempts = 0;
      const tool = aui.ai('ai-tool', {
        input: z.object({ prompt: z.string() }),
        execute: async (input) => {
          attempts++;
          if (attempts < 2) {
            throw new Error('Temporary failure');
          }
          return { response: `AI: ${input.prompt}` };
        },
        retry: 3
      });

      const result = await tool.execute({ 
        input: { prompt: 'test' } 
      });

      expect(attempts).toBe(2);
      expect(result).toEqual({ response: 'AI: test' });
    });

    it('should support aiTools() batch creation', () => {
      const tools = aui.aiTools({
        chat: {
          input: z.object({ message: z.string() }),
          execute: async (input) => ({ response: input.message })
        },
        image: {
          input: z.object({ prompt: z.string() }),
          execute: async (input) => ({ url: `image-${input.prompt}` })
        }
      });

      expect(tools.chat.name).toBe('chat');
      expect(tools.image.name).toBe('image');
      expect(registry.get('chat')).toBeDefined();
      expect(registry.get('image')).toBeDefined();
    });
  });

  describe('Server-Only Tools', () => {
    it('should create server-only tools', () => {
      const tool = aui.server(
        'database',
        z.object({ query: z.string() }),
        async (input) => ({ results: [] })
      );

      expect(tool.name).toBe('database');
      expect(tool.isServerOnly).toBe(true);
      expect(tool.clientExecute).toBeUndefined();
    });

    it('should enforce server-only with serverOnly() method', () => {
      const tool = aui
        .tool('secure')
        .input(z.object({ data: z.string() }))
        .serverOnly()
        .execute(async ({ input }) => ({ processed: input.data }))
        .build();

      expect(tool.isServerOnly).toBe(true);
    });
  });

  describe('Tool Registration', () => {
    it('should register tools automatically with helper methods', () => {
      aui.simple('test1', z.object({}), async () => 'result1');
      aui.create('test2', {
        input: z.object({}),
        execute: async () => 'result2'
      });

      expect(aui.getTool('test1')).toBeDefined();
      expect(aui.getTool('test2')).toBeDefined();
    });

    it('should list all registered tools', () => {
      aui.simple('tool1', z.object({}), async () => 'result1');
      aui.simple('tool2', z.object({}), async () => 'result2');

      const tools = aui.getTools();
      const names = tools.map(t => t.name);
      
      expect(names).toContain('tool1');
      expect(names).toContain('tool2');
    });
  });

  describe('Chainable Methods', () => {
    it('should support method chaining with aliases', () => {
      const tool = aui
        .t('chain')
        .i(z.object({ value: z.number() }))  // input alias
        .e(async (input) => input.value * 2)   // execute alias
        .r((data) => React.createElement('div', {}, data))  // render alias
        .b();  // build alias

      expect(tool.name).toBe('chain');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
      expect(tool.render).toBeDefined();
    });

    it('should support quick mode for auto-building', () => {
      const tool = aui
        .quick('auto')
        .input(z.object({ text: z.string() }))
        .execute(async ({ input }) => input.text)
        .render(({ data }) => React.createElement('div', {}, data));

      // Quick mode auto-builds after render
      expect(tool.name).toBe('auto');
      expect(typeof tool.execute).toBe('function');
    });
  });

  describe('Context and Cache Support', () => {
    it('should provide context in execute handlers', async () => {
      let receivedContext: any;
      
      const tool = aui
        .tool('context-test')
        .input(z.object({ key: z.string() }))
        .execute(async ({ input, ctx }) => {
          receivedContext = ctx;
          return { key: input.key };
        })
        .build();

      const ctx = { cache: new Map(), fetch: globalThis.fetch };
      await tool.execute({ input: { key: 'test' }, ctx });

      expect(receivedContext).toBeDefined();
      expect(receivedContext.cache).toBeDefined();
      expect(receivedContext.fetch).toBeDefined();
    });
  });
});