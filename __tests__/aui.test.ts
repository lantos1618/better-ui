import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import aui, { z, AUITool } from '../lib/aui';

describe('AUI - Concise Tool System', () => {
  beforeEach(() => {
    // Clear registry between tests
    aui.clear();
  });

  describe('Tool Creation', () => {
    it('creates a tool with execute and render', () => {
      const tool = aui
        .tool('simple')
        .input(z.object({ name: z.string() }))
        .execute(async ({ input }) => `Hello, ${input.name}`)
        .render(({ data }) => data as any);

      expect(tool.name).toBe('simple');
      expect(aui.get('simple')).toBe(tool);
    });

    it('executes without client context', async () => {
      const tool = aui
        .tool('greet')
        .input(z.object({ name: z.string() }))
        .execute(async ({ input }) => `Hi ${input.name}`);

      const result = await tool.run({ name: 'World' });
      expect(result).toBe('Hi World');
    });

    it('validates input with Zod', async () => {
      const tool = aui
        .tool('validate')
        .input(z.object({ 
          age: z.number().min(0).max(120) 
        }))
        .execute(async ({ input }) => input.age);

      await expect(tool.run({ age: -1 })).rejects.toThrow();
      await expect(tool.run({ age: 150 })).rejects.toThrow();
      
      const result = await tool.run({ age: 25 });
      expect(result).toBe(25);
    });
  });

  describe('Complex Tool Pattern', () => {
    it('uses clientExecute when context provided', async () => {
      const tool = aui
        .tool('cached')
        .input(z.object({ key: z.string() }))
        .execute(async ({ input }) => `server:${input.key}`)
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.key);
          return cached || `client:${input.key}`;
        });

      // Without context - uses server execute
      const serverResult = await tool.run({ key: 'test' });
      expect(serverResult).toBe('server:test');

      // With context - uses client execute
      const ctx = {
        cache: new Map([['test', 'cached:test']]),
        fetch: globalThis.fetch
      };
      const clientResult = await tool.run({ key: 'test' }, ctx);
      expect(clientResult).toBe('cached:test');
    });

    it('handles async operations correctly', async () => {
      const tool = aui
        .tool('async')
        .execute(async ({ input }: { input: number }) => {
          await new Promise(r => setTimeout(r, 10));
          return input * 2;
        });

      const result = await tool.run(5);
      expect(result).toBe(10);
    });
  });

  describe('Tool Registry', () => {
    it('registers tools automatically on execute', () => {
      aui.tool('tool1').execute(async () => 'result1');
      aui.tool('tool2').execute(async () => 'result2');

      const tools = aui.list();
      expect(tools.length).toBe(2);
      expect(tools[0].name).toBe('tool1');
      expect(tools[1].name).toBe('tool2');
    });

    it('gets tools by name', () => {
      const tool = aui.tool('findme').execute(async () => 'found');
      
      const found = aui.get('findme');
      expect(found).toBe(tool);
      expect(aui.get('notfound')).toBeUndefined();
    });

    it('executes tools by name', async () => {
      aui.tool('calc')
        .input(z.object({ a: z.number(), b: z.number() }))
        .execute(async ({ input }) => input.a + input.b);

      const result = await aui.execute('calc', { a: 2, b: 3 });
      expect(result).toBe(5);

      await expect(aui.execute('unknown', {}))
        .rejects.toThrow('Tool "unknown" not found');
    });
  });

  describe('Minimal Pattern', () => {
    it('works without input schema', async () => {
      const tool = aui
        .tool('minimal')
        .execute(async ({ input }: { input: { msg: string } }) => input.msg);

      const result = await tool.run({ msg: 'test' });
      expect(result).toBe('test');
    });

    it('works with type inference', async () => {
      interface MyInput {
        x: number;
        y: number;
      }

      const tool = aui
        .tool('typed')
        .execute(async ({ input }: { input: MyInput }) => input.x + input.y);

      const result = await tool.run({ x: 10, y: 20 });
      expect(result).toBe(30);
    });
  });

  describe('No Build Required', () => {
    it('tool is immediately usable without .build()', async () => {
      // No .build() method exists or needed!
      const tool = aui
        .tool('auto')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => input.value * 3);

      // Tool is immediately usable
      const result = await tool.run({ value: 4 });
      expect(result).toBe(12);
    });

    it('creates new instance on each method call', () => {
      const tool1 = aui.tool('chain');
      const tool2 = tool1.input(z.object({ x: z.number() }));
      const tool3 = tool2.execute(async ({ input }) => input.x);
      
      // Each method returns the same tool instance (chained)
      expect(tool1).toBe(tool2);
      expect(tool2).toBe(tool3);
    });
  });

  describe('Edge Cases', () => {
    it('handles sync execute functions', async () => {
      const tool = aui
        .tool('sync')
        .execute(({ input }: { input: string }) => input.toUpperCase());

      const result = await tool.run('hello');
      expect(result).toBe('HELLO');
    });

    it('handles tools without render', async () => {
      const tool = aui
        .tool('norender')
        .execute(async () => 'data');

      const result = await tool.run({});
      expect(result).toBe('data');
      
      // Should work fine without render
      expect(tool.toJSON().hasRender).toBe(false);
    });

    it('exports tool definition correctly', () => {
      const tool = aui
        .tool('export')
        .input(z.object({ id: z.string() }))
        .execute(async ({ input }) => input.id);

      // Tool properties are directly accessible
      expect(tool.name).toBe('export');
      expect(tool.schema).toBeDefined();
      expect(tool.run).toBeDefined();
      expect(tool.renderer).toBeUndefined();
    });
  });
});