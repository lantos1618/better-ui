import aui, { z } from '../lantos-ultra';
import React from 'react';

describe('Lantos Ultra AUI', () => {
  beforeEach(() => {
    aui.clear();
  });

  describe('Simple Tool Pattern', () => {
    it('should create minimal tool with just execute', async () => {
      const tool = aui
        .tool('minimal')
        .execute(async () => 'hello');

      const result = await tool.run(undefined);
      expect(result).toBe('hello');
    });

    it('should create tool with input and execute', async () => {
      const tool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }));

      const result = await tool.run({ city: 'NYC' });
      expect(result).toEqual({ temp: 72, city: 'NYC' });
    });

    it('should create tool with render method', () => {
      const tool = aui
        .tool('display')
        .input(z.object({ text: z.string() }))
        .execute(async ({ input }) => ({ message: input.text }))
        .render(({ data }) => React.createElement('div', {}, data.message));

      expect(tool.renderer).toBeDefined();
      const element = tool.renderer?.({ data: { message: 'test' } });
      expect(element?.type).toBe('div');
    });

    it('should validate input with zod schema', async () => {
      const tool = aui
        .tool('validated')
        .input(z.object({ 
          age: z.number().min(0).max(120) 
        }))
        .execute(async ({ input }) => ({ valid: true, age: input.age }));

      await expect(tool.run({ age: -5 })).rejects.toThrow();
      await expect(tool.run({ age: 150 })).rejects.toThrow();
      
      const result = await tool.run({ age: 25 });
      expect(result).toEqual({ valid: true, age: 25 });
    });
  });

  describe('Complex Tool Pattern', () => {
    it('should support client execution', async () => {
      const tool = aui
        .tool('search')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({ server: input.query }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.query);
          if (cached) return cached;
          
          const result = { client: input.query };
          ctx.cache.set(input.query, result);
          return result;
        });

      // Without context, uses execute
      const serverResult = await tool.run({ query: 'test' });
      expect(serverResult).toEqual({ server: 'test' });

      // With context, uses clientExecute
      const ctx = aui.createContext();
      const clientResult = await tool.run({ query: 'test' }, ctx);
      expect(clientResult).toEqual({ client: 'test' });

      // Cache hit
      const cachedResult = await tool.run({ query: 'test' }, ctx);
      expect(cachedResult).toEqual({ client: 'test' });
      expect(ctx.cache.get('test')).toEqual({ client: 'test' });
    });

    it('should handle async operations', async () => {
      const tool = aui
        .tool('async')
        .input(z.object({ delay: z.number() }))
        .execute(async ({ input }) => {
          await new Promise(r => setTimeout(r, input.delay));
          return { completed: true, delay: input.delay };
        });

      const start = Date.now();
      const result = await tool.run({ delay: 50 });
      const elapsed = Date.now() - start;

      expect(result).toEqual({ completed: true, delay: 50 });
      expect(elapsed).toBeGreaterThanOrEqual(45);
    });

    it('should handle errors properly', async () => {
      const tool = aui
        .tool('error')
        .input(z.object({ shouldFail: z.boolean() }))
        .execute(async ({ input }) => {
          if (input.shouldFail) {
            throw new Error('Intentional failure');
          }
          return { success: true };
        });

      await expect(tool.run({ shouldFail: true })).rejects.toThrow('Intentional failure');
      
      const result = await tool.run({ shouldFail: false });
      expect(result).toEqual({ success: true });
    });
  });

  describe('Tool Registry', () => {
    it('should register and retrieve tools', () => {
      const tool1 = aui.tool('tool1');
      const tool2 = aui.tool('tool2');

      expect(aui.get('tool1')).toBe(tool1);
      expect(aui.get('tool2')).toBe(tool2);
      expect(aui.get('nonexistent')).toBeUndefined();
    });

    it('should list all tools', () => {
      aui.tool('a');
      aui.tool('b');
      aui.tool('c');

      const tools = aui.list();
      expect(tools).toHaveLength(3);
      expect(tools.map(t => t.name)).toEqual(['a', 'b', 'c']);
    });

    it('should check tool existence', () => {
      aui.tool('exists');
      
      expect(aui.has('exists')).toBe(true);
      expect(aui.has('not-exists')).toBe(false);
    });

    it('should clear all tools', () => {
      aui.tool('test1');
      aui.tool('test2');
      expect(aui.list()).toHaveLength(2);

      aui.clear();
      expect(aui.list()).toHaveLength(0);
    });
  });

  describe('Execute Method', () => {
    it('should execute tool by name', async () => {
      aui
        .tool('calc')
        .input(z.object({ a: z.number(), b: z.number() }))
        .execute(async ({ input }) => ({ sum: input.a + input.b }));

      const result = await aui.execute('calc', { a: 5, b: 3 });
      expect(result).toEqual({ sum: 8 });
    });

    it('should throw for non-existent tool', async () => {
      await expect(aui.execute('missing', {})).rejects.toThrow('Tool "missing" not found');
    });

    it('should use provided context', async () => {
      let contextUsed = false;

      aui
        .tool('ctx-test')
        .execute(async ({ ctx }) => {
          if (ctx?.user) {
            contextUsed = true;
          }
          return { success: true };
        });

      const ctx = aui.createContext({ user: { id: 1 } });
      await aui.execute('ctx-test', {}, ctx);
      expect(contextUsed).toBe(true);
    });
  });

  describe('Context Creation', () => {
    it('should create default context', () => {
      const ctx = aui.createContext();
      
      expect(ctx.cache).toBeInstanceOf(Map);
      expect(ctx.fetch).toBeDefined();
      expect(ctx.user).toBeUndefined();
      expect(ctx.session).toBeUndefined();
    });

    it('should merge custom context', () => {
      const ctx = aui.createContext({
        user: { id: 1, name: 'Test' },
        session: { token: 'abc123' }
      });

      expect(ctx.user).toEqual({ id: 1, name: 'Test' });
      expect(ctx.session).toEqual({ token: 'abc123' });
      expect(ctx.cache).toBeInstanceOf(Map);
    });

    it('should maintain separate cache instances', () => {
      const ctx1 = aui.createContext();
      const ctx2 = aui.createContext();

      ctx1.cache.set('key', 'value1');
      ctx2.cache.set('key', 'value2');

      expect(ctx1.cache.get('key')).toBe('value1');
      expect(ctx2.cache.get('key')).toBe('value2');
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety through method chains', async () => {
      const tool = aui
        .tool('typed')
        .input(z.object({ 
          name: z.string(),
          age: z.number() 
        }))
        .execute(async ({ input }) => ({
          greeting: `Hello ${input.name}, age ${input.age}`
        }));

      const result = await tool.run({ name: 'Alice', age: 30 });
      expect(result.greeting).toBe('Hello Alice, age 30');
    });

    it('should handle optional fields', async () => {
      const tool = aui
        .tool('optional')
        .input(z.object({
          required: z.string(),
          optional: z.string().optional()
        }))
        .execute(async ({ input }) => ({
          hasOptional: input.optional !== undefined
        }));

      const result1 = await tool.run({ required: 'test' });
      expect(result1.hasOptional).toBe(false);

      const result2 = await tool.run({ required: 'test', optional: 'value' });
      expect(result2.hasOptional).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle tool without execute handler', async () => {
      const tool = aui.tool('no-execute');
      await expect(tool.run({})).rejects.toThrow('Tool no-execute has no execute handler');
    });

    it('should handle synchronous execute functions', async () => {
      const tool = aui
        .tool('sync')
        .execute(({ input }) => ({ doubled: (input as any).value * 2 }));

      const result = await tool.run({ value: 5 });
      expect(result).toEqual({ doubled: 10 });
    });

    it('should handle complex nested schemas', async () => {
      const tool = aui
        .tool('nested')
        .input(z.object({
          user: z.object({
            name: z.string(),
            preferences: z.object({
              theme: z.enum(['light', 'dark']),
              notifications: z.boolean()
            })
          })
        }))
        .execute(async ({ input }) => ({
          summary: `${input.user.name} prefers ${input.user.preferences.theme}`
        }));

      const result = await tool.run({
        user: {
          name: 'Bob',
          preferences: {
            theme: 'dark',
            notifications: true
          }
        }
      });

      expect(result.summary).toBe('Bob prefers dark');
    });
  });
});