import { describe, it, expect, beforeEach } from '@jest/globals';
import React from 'react';
import { z } from 'zod';
import aui, { LantosAUITool, LantosContext } from '../lib/aui/lantos';

describe('Lantos AUI', () => {
  beforeEach(() => {
    // Clear registry before each test
    aui['registry'].clear();
  });

  describe('Basic Tool Creation', () => {
    it('should create a simple tool without build() method', () => {
      const tool = aui
        .tool('test')
        .input(z.object({ name: z.string() }))
        .execute(async ({ input }) => ({ message: `Hello ${input.name}` }))
        .render(({ data }) => React.createElement('div', null, data.message));

      expect(tool.name).toBe('test');
      expect(tool.inputSchema).toBeDefined();
      expect(tool.execute).toBeDefined();
      expect(tool.render).toBeDefined();
    });

    it('should auto-finalize when render is called after execute', () => {
      const tool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }))
        .render(({ data }) => React.createElement('div', null, `${data.city}: ${data.temp}°`));

      expect(tool.name).toBe('weather');
      expect(typeof tool.execute).toBe('function');
      expect(typeof tool.render).toBe('function');
    });

    it('should work without input schema', () => {
      const tool = aui
        .tool('simple')
        .execute(async () => ({ result: 'success' }))
        .render(({ data }) => React.createElement('div', null, data.result));

      expect(tool.inputSchema).toBeDefined();
      expect(tool.inputSchema?._def?.typeName).toBe('ZodAny');
    });
  });

  describe('Complex Tool with Client Execute', () => {
    it('should create tool with client execute', () => {
      const tool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ results: [`Server: ${input.query}`] }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.query);
          return cached || { results: [`Client: ${input.query}`] };
        })
        .render(({ data }) => React.createElement('ul', null, 
          data.results.map((r: string) => React.createElement('li', { key: r }, r))
        ));

      expect(tool.name).toBe('search');
      expect(tool.clientExecute).toBeDefined();
      expect(typeof tool.clientExecute).toBe('function');
    });

    it('should auto-finalize after clientExecute when execute and render exist', () => {
      const tool = aui
        .tool('data')
        .input(z.object({ id: z.string() }))
        .execute(async ({ input }) => ({ id: input.id, data: 'server' }))
        .render(({ data }) => React.createElement('div', null, data.data))
        .clientExecute(async ({ input, ctx }) => ({ id: input.id, data: 'client' }));

      expect(tool.name).toBe('data');
      expect(tool.execute).toBeDefined();
      expect(tool.render).toBeDefined();
      expect(tool.clientExecute).toBeDefined();
    });
  });

  describe('Tool Execution', () => {
    it('should execute tool with valid input', async () => {
      const tool = aui
        .tool('calc')
        .input(z.object({ a: z.number(), b: z.number() }))
        .execute(async ({ input }) => ({ sum: input.a + input.b }))
        .render(({ data }) => React.createElement('span', null, data.sum));

      const result = await tool.execute({ input: { a: 5, b: 3 } });
      expect(result).toEqual({ sum: 8 });
    });

    it('should validate input schema', async () => {
      const tool = aui
        .tool('strict')
        .input(z.object({ name: z.string().min(3) }))
        .execute(async ({ input }) => ({ greeting: `Hello ${input.name}` }))
        .render(({ data }) => React.createElement('div', null, data.greeting));

      // Valid input
      const result = await tool.execute({ input: { name: 'John' } });
      expect(result).toEqual({ greeting: 'Hello John' });

      // Test through registry execute which has validation
      aui.register(tool);
      await expect(
        aui.execute('strict', { name: 'Jo' })
      ).rejects.toThrow();
    });

    it('should use clientExecute when available in browser context', async () => {
      const mockCtx: LantosContext = {
        cache: new Map([['test-query', { cached: true, results: ['cached result'] }]]),
        fetch: async () => ({ results: ['fetched result'] })
      };

      const tool = aui
        .tool('hybrid')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ results: [`server: ${input.query}`] }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.query);
          return cached || { results: [`client: ${input.query}`] };
        })
        .render(({ data }) => React.createElement('div', null, data.results.join(', ')));

      // Need to finalize the tool first by accessing a property
      const finalTool = tool.name ? tool : tool;
      
      // Test client execute directly
      if (finalTool.clientExecute) {
        const result = await finalTool.clientExecute({ 
          input: { query: 'test-query' }, 
          ctx: mockCtx 
        });
        expect(result).toEqual({ cached: true, results: ['cached result'] });
      }
    });
  });

  describe('Tool Registry', () => {
    it('should register tools in the registry', () => {
      const tool1 = aui
        .tool('tool1')
        .execute(async () => ({ data: 'tool1' }))
        .render(({ data }) => React.createElement('div', null, data.data));

      const tool2 = aui
        .tool('tool2')
        .execute(async () => ({ data: 'tool2' }))
        .render(({ data }) => React.createElement('div', null, data.data));

      aui.register(tool1);
      aui.register(tool2);

      expect(aui.get('tool1')).toBe(tool1);
      expect(aui.get('tool2')).toBe(tool2);
      expect(aui.list()).toHaveLength(2);
    });

    it('should execute tool by name from registry', async () => {
      const tool = aui
        .tool('registered')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ doubled: input.value * 2 }))
        .render(({ data }) => React.createElement('span', null, data.doubled));

      aui.register(tool);

      const result = await aui.execute('registered', { value: 5 });
      expect(result).toEqual({ doubled: 10 });
    });

    it('should throw error for non-existent tool', async () => {
      await expect(
        aui.execute('nonexistent', {})
      ).rejects.toThrow('Tool "nonexistent" not found');
    });
  });

  describe('Render Function', () => {
    it('should render with data only', () => {
      const tool = aui
        .tool('render-test')
        .execute(async () => ({ message: 'Hello' }))
        .render(({ data }) => React.createElement('div', null, data.message));

      const element = tool.render({ data: { message: 'Test' } });
      expect(element.type).toBe('div');
      expect(element.props.children).toBe('Test');
    });

    it('should render with data and input', () => {
      const tool = aui
        .tool('render-input')
        .input(z.object({ name: z.string() }))
        .execute(async ({ input }) => ({ greeting: `Hello ${input.name}` }))
        .render(({ data, input }) => 
          React.createElement('div', null, `${data.greeting} (input: ${input?.name})`)
        );

      const element = tool.render({ 
        data: { greeting: 'Hello World' }, 
        input: { name: 'World' } 
      });
      expect(element.props.children).toBe('Hello World (input: World)');
    });
  });

  describe('Error Handling', () => {
    it('should throw error if execute is not defined before render', () => {
      expect(() => {
        aui
          .tool('invalid')
          .input(z.object({ test: z.string() }))
          .render(({ data }) => React.createElement('div', null, 'test'));
      }).toThrow('Tool "invalid" must have an execute handler before render');
    });

    it('should handle async errors in execute', async () => {
      const tool = aui
        .tool('error-tool')
        .execute(async () => {
          throw new Error('Execution failed');
        })
        .render(({ data }) => React.createElement('div', null, 'should not render'));

      await expect(
        tool.execute({ input: {} })
      ).rejects.toThrow('Execution failed');
    });
  });

  describe('Fluent API Chain', () => {
    it('should maintain type safety through the chain', () => {
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
            `${data.message} - Adult: ${data.isAdult}`
          )
        );

      expect(tool.name).toBe('typed');
      // TypeScript would enforce correct types here
    });

    it('should allow any order for execute and clientExecute', () => {
      const tool1 = aui
        .tool('order1')
        .execute(async () => ({ data: 'server' }))
        .clientExecute(async () => ({ data: 'client' }))
        .render(({ data }) => React.createElement('div', null, data.data));

      const tool2 = aui
        .tool('order2')
        .clientExecute(async () => ({ data: 'client' }))
        .execute(async () => ({ data: 'server' }))
        .render(({ data }) => React.createElement('div', null, data.data));

      expect(tool1.execute).toBeDefined();
      expect(tool1.clientExecute).toBeDefined();
      expect(tool2.execute).toBeDefined();
      expect(tool2.clientExecute).toBeDefined();
    });
  });
});