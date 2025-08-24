import { describe, it, expect, beforeEach } from '@jest/globals';
import aui, { z } from '../aui';
import React from 'react';

describe('AUI Ultra-Concise API', () => {
  beforeEach(() => {
    // Clear any registered tools between tests
    aui['tools'].clear();
  });

  describe('Tool Creation', () => {
    it('should create a simple tool with just 2 methods', () => {
      const tool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }));

      expect(tool.name).toBe('weather');
      expect(tool.schema).toBeDefined();
    });

    it('should create a complex tool with client execution', () => {
      const tool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ results: [`Result for ${input.query}`] }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.query);
          if (cached) return cached;
          return { results: [`Cached result for ${input.query}`] };
        });

      expect(tool.name).toBe('search');
      expect(tool['_clientExecute']).toBeDefined();
    });

    it('should create a tool with render method', () => {
      const tool = aui
        .tool('display')
        .input(z.object({ text: z.string() }))
        .execute(async ({ input }) => input.text)
        .render(({ data }) => React.createElement('div', null, data));

      expect(tool.renderFn).toBeDefined();
    });
  });

  describe('Tool Execution', () => {
    it('should execute a tool with valid input', async () => {
      const tool = aui
        .tool('calculator')
        .input(z.object({ a: z.number(), b: z.number() }))
        .execute(async ({ input }) => input.a + input.b);

      const result = await tool.run({ a: 5, b: 3 });
      expect(result).toBe(8);
    });

    it('should validate input schema', async () => {
      const tool = aui
        .tool('strict')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => input.value * 2);

      await expect(tool.run({ value: 'not a number' } as any)).rejects.toThrow();
    });

    it('should use client execution when context is provided', async () => {
      const mockCtx = {
        cache: new Map(),
        fetch: global.fetch,
        user: { id: 1 },
        session: { token: 'abc' }
      };

      const tool = aui
        .tool('cached')
        .input(z.object({ key: z.string() }))
        .execute(async ({ input }) => `server: ${input.key}`)
        .clientExecute(async ({ input, ctx }) => {
          ctx.cache.set(input.key, `cached: ${input.key}`);
          return `client: ${input.key}`;
        });

      const result = await tool.run({ key: 'test' }, mockCtx);
      expect(result).toBe('client: test');
      expect(mockCtx.cache.get('test')).toBe('cached: test');
    });
  });

  describe('Tool Registry', () => {
    it('should register and retrieve tools', () => {
      const tool = aui
        .tool('registered')
        .input(z.object({ id: z.number() }))
        .execute(async ({ input }) => input.id);

      const retrieved = aui.get('registered');
      expect(retrieved).toBe(tool);
    });

    it('should list all registered tools', () => {
      aui.tool('tool1').execute(async () => 1);
      aui.tool('tool2').execute(async () => 2);
      aui.tool('tool3').execute(async () => 3);

      const tools = aui.list();
      expect(tools).toEqual(['tool1', 'tool2', 'tool3']);
    });

    it('should execute tool by name', async () => {
      aui
        .tool('named')
        .input(z.object({ value: z.string() }))
        .execute(async ({ input }) => `Result: ${input.value}`);

      const result = await aui.execute('named', { value: 'test' });
      expect(result).toBe('Result: test');
    });

    it('should throw error for non-existent tool', async () => {
      await expect(aui.execute('nonexistent', {})).rejects.toThrow('Tool "nonexistent" not found');
    });
  });

  describe('Context Management', () => {
    it('should provide cache in context', async () => {
      const ctx = {
        cache: new Map<string, any>(),
        fetch: global.fetch
      };

      const tool = aui
        .tool('cache-test')
        .input(z.object({ key: z.string(), value: z.string() }))
        .clientExecute(async ({ input, ctx }) => {
          ctx.cache.set(input.key, input.value);
          return ctx.cache.get(input.key);
        });

      const result = await tool.run({ key: 'test', value: 'data' }, ctx);
      expect(result).toBe('data');
      expect(ctx.cache.get('test')).toBe('data');
    });

    it('should share cache between multiple executions', async () => {
      const ctx = {
        cache: new Map<string, any>(),
        fetch: global.fetch
      };

      const tool = aui
        .tool('shared-cache')
        .input(z.object({ key: z.string() }))
        .clientExecute(async ({ input, ctx }) => {
          const count = ctx.cache.get(input.key) || 0;
          ctx.cache.set(input.key, count + 1);
          return count + 1;
        });

      const result1 = await tool.run({ key: 'counter' }, ctx);
      const result2 = await tool.run({ key: 'counter' }, ctx);
      const result3 = await tool.run({ key: 'counter' }, ctx);

      expect(result1).toBe(1);
      expect(result2).toBe(2);
      expect(result3).toBe(3);
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
          greeting: `Hello ${input.name}`,
          nextAge: input.age + 1
        }));

      // TypeScript should infer these types correctly
      type InputType = Parameters<typeof tool.run>[0];
      type OutputType = Awaited<ReturnType<typeof tool.run>>;

      const testInput: InputType = { name: 'John', age: 30 };
      expect(testInput).toEqual({ name: 'John', age: 30 });
    });
  });

  describe('Error Handling', () => {
    it('should handle execution errors gracefully', async () => {
      const tool = aui
        .tool('error-prone')
        .execute(async () => {
          throw new Error('Execution failed');
        });

      await expect(tool.run({})).rejects.toThrow('Execution failed');
    });

    it('should handle client execution errors', async () => {
      const ctx = {
        cache: new Map(),
        fetch: global.fetch
      };

      const tool = aui
        .tool('client-error')
        .clientExecute(async () => {
          throw new Error('Client execution failed');
        });

      await expect(tool.run({}, ctx)).rejects.toThrow('Client execution failed');
    });
  });
});

describe('AUI Integration', () => {
  it('should work with React components', () => {
    const tool = aui
      .tool('react-tool')
      .input(z.object({ message: z.string() }))
      .execute(async ({ input }) => input.message)
      .render(({ data }) => React.createElement('div', { className: 'message' }, data));

    const rendered = tool.renderFn?.({ data: 'Hello World' });
    expect(rendered).toBeDefined();
    expect(rendered?.props.className).toBe('message');
    expect(rendered?.props.children).toBe('Hello World');
  });

  it('should support complex workflows', async () => {
    // Create multiple interconnected tools
    const fetchUser = aui
      .tool('fetchUser')
      .input(z.object({ id: z.number() }))
      .execute(async ({ input }) => ({
        id: input.id,
        name: `User ${input.id}`,
        email: `user${input.id}@example.com`
      }));

    const fetchPosts = aui
      .tool('fetchPosts')
      .input(z.object({ userId: z.number() }))
      .execute(async ({ input }) => [
        { id: 1, userId: input.userId, title: 'Post 1' },
        { id: 2, userId: input.userId, title: 'Post 2' }
      ]);

    // Execute workflow
    const user = await fetchUser.run({ id: 1 });
    const posts = await fetchPosts.run({ userId: user.id });

    expect(user.name).toBe('User 1');
    expect(posts).toHaveLength(2);
    expect(posts[0].userId).toBe(1);
  });
});