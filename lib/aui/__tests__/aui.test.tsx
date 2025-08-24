import { describe, it, expect, beforeEach } from '@jest/globals';
import aui, { z } from '../index';
import React from 'react';

describe('AUI Concise API', () => {
  beforeEach(() => {
    // Clear any existing tools
    aui.clear();
  });

  describe('Tool Creation', () => {
    it('should create a tool without .build() method', () => {
      const tool = aui
        .tool('test')
        .input(z.object({ name: z.string() }))
        .execute(async ({ input }) => ({ message: `Hello ${input.name}` }));

      expect(tool.name).toBe('test');
      expect(aui.get('test')).toBe(tool);
    });

    it('should chain methods fluently', () => {
      const tool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }))
        .render(({ data }) => React.createElement('div', null, `${data.city}: ${data.temp}°`));

      expect(tool.name).toBe('weather');
      expect(aui.get('weather')).toBe(tool);
    });

    it('should support client execution', () => {
      const tool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ results: [] }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.query);
          return cached || { results: [] };
        });

      expect(tool.name).toBe('search');
      expect(aui.get('search')).toBe(tool);
    });
  });

  describe('Tool Execution', () => {
    it('should execute server-side handler', async () => {
      const tool = aui
        .tool('calc')
        .input(z.object({ a: z.number(), b: z.number() }))
        .execute(async ({ input }) => ({ result: input.a + input.b }));

      const result = await tool.run({ a: 5, b: 3 });
      expect(result).toEqual({ result: 8 });
    });

    it('should execute client-side handler with context', async () => {
      const cache = new Map();
      cache.set('test', { cached: true });

      const tool = aui
        .tool('cached')
        .input(z.object({ key: z.string() }))
        .clientExecute(async ({ input, ctx }) => {
          return ctx.cache.get(input.key) || { cached: false };
        });

      const result = await tool.run({ key: 'test' }, {
        cache,
        fetch: async () => ({ ok: true }) as any
      });

      expect(result).toEqual({ cached: true });
    });

    it('should validate input with Zod schema', async () => {
      const tool = aui
        .tool('validated')
        .input(z.object({ 
          email: z.string().email(),
          age: z.number().min(0)
        }))
        .execute(async ({ input }) => ({ valid: true }));

      // Valid input
      const validResult = await tool.run({ email: 'test@example.com', age: 25 });
      expect(validResult).toEqual({ valid: true });

      // Invalid input should throw
      await expect(async () => {
        await tool.run({ email: 'invalid', age: -1 });
      }).rejects.toThrow();
    });
  });

  describe('Tool Registry', () => {
    it('should register and retrieve tools', () => {
      const tool = aui
        .tool('registered')
        .input(z.object({ id: z.string() }))
        .execute(async ({ input }) => ({ id: input.id }));

      const retrieved = aui.get('registered');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('registered');
    });

    it('should list all registered tools', () => {
      aui.tool('tool1').execute(async () => ({}));
      aui.tool('tool2').execute(async () => ({}));
      
      const names = aui.getToolNames();
      
      expect(names).toContain('tool1');
      expect(names).toContain('tool2');
    });
  });

  describe('Rendering', () => {
    it('should render React components', () => {
      const tool = aui
        .tool('render-test')
        .input(z.object({ text: z.string() }))
        .execute(async ({ input }) => ({ message: input.text }))
        .render(({ data }) => React.createElement('div', null, data.message));

      const rendered = tool.renderResult({ message: 'Hello' }, { text: 'Hello' });
      
      expect(rendered).toBeDefined();
      expect(rendered?.type).toBe('div');
      expect(rendered?.props.children).toBe('Hello');
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety through chaining', () => {
      const tool = aui
        .tool('typed')
        .input(z.object({ 
          name: z.string(),
          age: z.number()
        }))
        .execute(async ({ input }) => ({
          greeting: `Hello ${input.name}, you are ${input.age} years old`
        }))
        .render(({ data }) => React.createElement('span', null, data.greeting));

      // Tool should be properly registered
      expect(aui.get('typed')).toBe(tool);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tools without input schema', () => {
      const tool = aui
        .tool('no-input')
        .execute(async () => ({ timestamp: Date.now() }));

      expect(tool.inputSchema).toBeUndefined();
      expect(tool.execute).toBeDefined();
    });

    it('should handle tools without render method', () => {
      const tool = aui
        .tool('no-render')
        .input(z.object({ id: z.string() }))
        .execute(async ({ input }) => ({ id: input.id }));

      expect(tool.render).toBeUndefined();
    });

    it('should allow updating tool properties through chaining', () => {
      let tool = aui
        .tool('mutable')
        .input(z.object({ a: z.number() }));

      // Add execute later
      tool = tool.execute(async ({ input }) => ({ result: input.a * 2 }));

      // Add render even later
      tool = tool.render(({ data }) => React.createElement('div', null, data.result));

      expect(tool.execute).toBeDefined();
      expect(tool.render).toBeDefined();
    });
  });
});