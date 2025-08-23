import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import React from 'react';
import aui, { createRegistry } from '../index';
import { z } from 'zod';

describe('AUI API Tests', () => {
  beforeEach(() => {
    // Clear global registry between tests
    aui.getTools().forEach(tool => {
      aui['registry'].tools.delete(tool.name);
    });
  });

  describe('Minimal API', () => {
    it('should create tool with just input and execute', () => {
      const tool = aui
        .tool('minimal')
        .input(z.object({ msg: z.string() }))
        .execute(async ({ input }) => input.msg.toUpperCase())
        .build();

      expect(tool.name).toBe('minimal');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
    });

    it('should work with simple input parameter', async () => {
      const tool = aui
        .tool('simple-param')
        .input(z.object({ text: z.string() }))
        .execute(async ({ input }) => `Processed: ${input.text}`)
        .build();

      const result = await tool.execute({ 
        input: { text: 'hello' },
        ctx: { cache: new Map(), fetch: async () => null }
      });
      expect(result).toBe('Processed: hello');
    });
  });

  describe('Simple Tool Pattern', () => {
    it('should create tool with input, execute, and render', () => {
      const tool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }))
        .render(({ data }) => React.createElement('div', null, `${data.city}: ${data.temp}°`))
        .build();

      expect(tool.name).toBe('weather');
      expect(tool.render).toBeDefined();
    });
  });

  describe('Complex Tool with Client Execution', () => {
    it('should support both server and client execution', () => {
      const tool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ results: [`Server: ${input.query}`] }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.query);
          return cached || { results: [`Client: ${input.query}`] };
        })
        .render(({ data }) => React.createElement('div', null, data.results.join(', ')))
        .build();

      expect(tool.execute).toBeDefined();
      expect(tool.clientExecute).toBeDefined();
      expect(tool.isServerOnly).toBe(false);
    });
  });

  describe('Helper Methods', () => {
    it('should create and register tool using simple() helper', () => {
      const tool = aui.simple(
        'greeting',
        z.object({ name: z.string() }),
        async (input) => `Hello, ${input.name}!`
      );

      expect(tool.name).toBe('greeting');
      expect(aui.getTool('greeting')).toBe(tool);
    });

    it('should create server-only tool using server() helper', () => {
      const tool = aui.server(
        'db-write',
        z.object({ data: z.string() }),
        async (input) => ({ saved: true })
      );

      expect(tool.name).toBe('db-write');
      expect(tool.isServerOnly).toBe(true);
    });

    it('should support contextual() helper', () => {
      const tool = aui.contextual(
        'user-check',
        z.object({ userId: z.string() }),
        async ({ input, ctx }) => ({ 
          userId: input.userId,
          hasContext: !!ctx 
        })
      );

      expect(tool.name).toBe('user-check');
    });
  });

  describe('Builder Method Combinations', () => {
    it('should support handle() for input+execute combo', async () => {
      const tool = aui
        .tool('calc')
        .handle(
          z.object({ a: z.number(), b: z.number() }),
          async (input) => input.a + input.b
        )
        .build();

      const result = await tool.execute({
        input: { a: 5, b: 3 },
        ctx: { cache: new Map(), fetch: async () => null }
      });
      expect(result).toBe(8);
    });

    it('should support run() for execute+render combo', () => {
      const tool = aui
        .tool('display')
        .input(z.object({ text: z.string() }))
        .run(
          async (input) => input.text.toUpperCase(),
          (data) => React.createElement('span', null, data)
        )
        .build();

      expect(tool.execute).toBeDefined();
      expect(tool.render).toBeDefined();
    });
  });

  describe('Context Support', () => {
    it('should detect context usage in execute handler', async () => {
      const tool = aui
        .tool('ctx-aware')
        .input(z.object({ id: z.string() }))
        .execute(async ({ input, ctx }) => {
          return { id: input.id, hasCache: ctx ? ctx.cache.size : 0 };
        })
        .build();

      const result = await tool.execute({
        input: { id: 'test' },
        ctx: { 
          cache: new Map([['key', 'value']]), 
          fetch: async () => null 
        }
      });
      expect(result.hasCache).toBe(1);
    });

    it('should work with destructured parameters', async () => {
      const tool = aui
        .tool('destruct')
        .input(z.object({ msg: z.string() }))
        .execute(async ({ input }) => `Got: ${input.msg}`)
        .build();

      const result = await tool.execute({
        input: { msg: 'test' },
        ctx: { cache: new Map(), fetch: async () => null }
      });
      expect(result).toBe('Got: test');
    });
  });

  describe('Metadata and Description', () => {
    it('should support description and metadata', () => {
      const tool = aui
        .tool('annotated')
        .description('A tool with metadata')
        .metadata({ version: '1.0', category: 'utility' })
        .input(z.object({ data: z.string() }))
        .execute(async ({ input }) => input.data)
        .build();

      expect(tool.description).toBe('A tool with metadata');
      expect(tool.metadata?.version).toBe('1.0');
      expect(tool.metadata?.category).toBe('utility');
    });
  });

  describe('Server-Only Mode', () => {
    it('should mark tool as server-only', () => {
      const tool = aui
        .tool('server-only')
        .serverOnly()
        .input(z.object({ secret: z.string() }))
        .execute(async ({ input }) => ({ processed: true }))
        .build();

      expect(tool.isServerOnly).toBe(true);
      expect(tool.clientExecute).toBeUndefined();
    });
  });

  describe('Registry Management', () => {
    it('should register and retrieve tools', () => {
      const tool = aui
        .tool('registered')
        .input(z.object({ id: z.string() }))
        .execute(async ({ input }) => input.id)
        .build();

      aui.register(tool);
      
      expect(aui.getTool('registered')).toBe(tool);
      expect(aui.getTools()).toContainEqual(tool);
    });

    it('should create separate registry instances', () => {
      const registry1 = createRegistry();
      const registry2 = createRegistry();
      
      const aui1 = new (aui.constructor as any)(registry1);
      const aui2 = new (aui.constructor as any)(registry2);

      const tool1 = aui1.tool('tool1')
        .input(z.object({ x: z.number() }))
        .execute(async ({ input }) => input.x)
        .build();

      aui1.register(tool1);

      expect(aui1.getTool('tool1')).toBe(tool1);
      expect(aui2.getTool('tool1')).toBeUndefined();
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety through transformations', () => {
      const tool = aui
        .tool('typed')
        .input(z.object({ 
          name: z.string(),
          age: z.number() 
        }))
        .execute(async ({ input }) => ({
          message: `${input.name} is ${input.age} years old`,
          isAdult: input.age >= 18
        }))
        .render(({ data }) => 
          React.createElement('div', null, 
            data.message + (data.isAdult ? ' (adult)' : ' (minor)')
          )
        )
        .build();

      expect(tool.inputSchema).toBeDefined();
    });
  });

  describe('Alias Methods', () => {
    it('should support client() as alias for clientExecute()', () => {
      const tool = aui
        .tool('alias-test')
        .input(z.object({ id: z.string() }))
        .execute(async ({ input }) => ({ server: input.id }))
        .client(async ({ input, ctx }) => ({ client: input.id }))
        .build();

      expect(tool.clientExecute).toBeDefined();
    });

    it('should support clientEx() as alias for clientExecute()', () => {
      const tool = aui
        .tool('alias-test-2')
        .input(z.object({ id: z.string() }))
        .execute(async ({ input }) => ({ server: input.id }))
        .clientEx(async ({ input, ctx }) => ({ client: input.id }))
        .build();

      expect(tool.clientExecute).toBeDefined();
    });

    it('should support done() as alias for build()', () => {
      const tool = aui
        .tool('done-test')
        .input(z.object({ x: z.number() }))
        .execute(async ({ input }) => input.x * 2)
        .done();

      expect(tool.name).toBe('done-test');
      expect(tool.execute).toBeDefined();
    });
  });

  describe('Enhanced AUI Methods', () => {
    it('should support do() method for all-in-one tool creation', async () => {
      const tool = aui.do('do-test', async (input: string) => input.toUpperCase());
      
      expect(tool.name).toBe('do-test');
      const result = await tool.execute({
        input: 'hello' as any,
        ctx: { cache: new Map(), fetch: jest.fn() }
      });
      expect(result).toBe('HELLO');
    });

    it('should support ai() method with retry logic', async () => {
      let attempts = 0;
      const tool = aui.ai('ai-test', {
        execute: async () => {
          attempts++;
          if (attempts < 2) throw new Error('Retry needed');
          return { success: true };
        },
        retry: 3
      });
      
      const result = await tool.execute({
        input: {},
        ctx: { cache: new Map(), fetch: jest.fn() }
      });
      expect(result).toEqual({ success: true });
      expect(attempts).toBe(2);
    });

    it('should support single-character aliases', async () => {
      const tool = aui.t('ultra')
        .i(z.object({ n: z.number() }))
        .e(async (input) => input.n * 2)
        .r((data) => React.createElement('div', {}, data))
        .b();
      
      expect(tool.name).toBe('ultra');
      const result = await tool.execute({
        input: { n: 5 },
        ctx: { cache: new Map(), fetch: jest.fn() }
      });
      expect(result).toBe(10);
    });

    it('should support builder do() method', async () => {
      const tool = aui.t('builder-do')
        .do({
          input: z.object({ x: z.number() }),
          execute: async (input) => input.x * 3,
          render: (data) => React.createElement('span', {}, data)
        });
      
      const result = await tool.execute({
        input: { x: 4 },
        ctx: { cache: new Map(), fetch: jest.fn() }
      });
      expect(result).toBe(12);
    });

    it('should support builder ai() method', async () => {
      const tool = aui.t('builder-ai')
        .ai({
          input: z.object({ val: z.number() }),
          execute: async (input) => input.val * 2,
          retry: 5,
          timeout: 1000,
          cache: true
        });
      
      expect(tool.metadata?.aiOptimized).toBe(true);
      expect(tool.metadata?.retry).toBe(5);
      expect(tool.metadata?.timeout).toBe(1000);
      expect(tool.metadata?.cache).toBe(true);
    });

    it('should support aiTools() batch creation', () => {
      const tools = aui.aiTools({
        tool1: {
          execute: async () => 'result1',
          retry: 3
        },
        tool2: {
          input: z.object({ x: z.number() }),
          execute: async (input) => input.x,
          cache: true
        }
      });
      
      expect(Object.keys(tools)).toHaveLength(2);
      expect(tools.tool1.metadata?.retry).toBe(3);
      expect(tools.tool2.metadata?.cache).toBe(true);
    });

    it('should support global AI mode settings', () => {
      aui.setAIMode(true, {
        retry: 5,
        timeout: 10000,
        cache: true
      });
      
      expect((aui as any).aiModeEnabled).toBe(true);
      expect((aui as any).aiOptions).toEqual({
        retry: 5,
        timeout: 10000,
        cache: true
      });
    });
  });
});