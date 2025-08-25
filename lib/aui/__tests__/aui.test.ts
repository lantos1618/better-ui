import aui, { AUI, z } from '../index';

describe('AUI System', () => {
  let testAUI: AUI;

  beforeEach(() => {
    testAUI = new AUI();
  });

  describe('Tool Creation', () => {
    it('should create a simple tool with just execute', async () => {
      const tool = testAUI
        .tool('simple')
        .execute(async ({ input }) => `Hello ${input}`);

      expect(tool.name).toBe('simple');
      const result = await tool.run('World');
      expect(result).toBe('Hello World');
    });

    it('should create a tool with input validation', async () => {
      const tool = testAUI
        .tool('validated')
        .input(z.object({ name: z.string(), age: z.number() }))
        .execute(async ({ input }) => `${input.name} is ${input.age} years old`);

      const result = await tool.run({ name: 'Alice', age: 30 });
      expect(result).toBe('Alice is 30 years old');

      // Test validation error
      await expect(tool.run({ name: 'Bob', age: 'not a number' as any })).rejects.toThrow();
    });

    it('should support client execution', async () => {
      const serverExecute = jest.fn(async ({ input }) => `server: ${input}`);
      const clientExecute = jest.fn(async ({ input }) => `client: ${input}`);

      const tool = testAUI
        .tool('dual')
        .execute(serverExecute)
        .clientExecute(clientExecute);

      // Without context (server execution)
      const serverResult = await tool.run('test');
      expect(serverResult).toBe('server: test');
      expect(serverExecute).toHaveBeenCalled();
      expect(clientExecute).not.toHaveBeenCalled();

      // Reset mocks
      serverExecute.mockClear();
      clientExecute.mockClear();

      // With context (client execution)
      const ctx = testAUI.createContext();
      const clientResult = await tool.run('test', ctx);
      expect(clientResult).toBe('client: test');
      expect(clientExecute).toHaveBeenCalled();
      expect(serverExecute).not.toHaveBeenCalled();
    });

    it('should handle render function', () => {
      const tool = testAUI
        .tool('renderable')
        .execute(async ({ input }) => ({ value: input }))
        .render(({ data }) => `Rendered: ${data.value}`);

      expect(tool.renderer).toBeDefined();
      if (tool.renderer) {
        const result = tool.renderer({ data: { value: 'test' } });
        expect(result).toBeDefined();
      }
    });
  });

  describe('Tool Management', () => {
    it('should register and retrieve tools', () => {
      const tool1 = testAUI.tool('tool1').execute(async () => 'result1');
      const tool2 = testAUI.tool('tool2').execute(async () => 'result2');

      expect(testAUI.has('tool1')).toBe(true);
      expect(testAUI.has('tool2')).toBe(true);
      expect(testAUI.get('tool1')).toBe(tool1);
      expect(testAUI.get('tool2')).toBe(tool2);
    });

    it('should list all tools', () => {
      testAUI.tool('a').execute(async () => 'a');
      testAUI.tool('b').execute(async () => 'b');
      testAUI.tool('c').execute(async () => 'c');

      const tools = testAUI.list();
      expect(tools).toHaveLength(3);
      
      const names = testAUI.getToolNames();
      expect(names).toEqual(['a', 'b', 'c']);
    });

    it('should remove tools', () => {
      testAUI.tool('removable').execute(async () => 'test');
      
      expect(testAUI.has('removable')).toBe(true);
      const removed = testAUI.remove('removable');
      expect(removed).toBe(true);
      expect(testAUI.has('removable')).toBe(false);
    });

    it('should clear all tools', () => {
      testAUI.tool('t1').execute(async () => '1');
      testAUI.tool('t2').execute(async () => '2');
      
      expect(testAUI.getTools()).toHaveLength(2);
      testAUI.clear();
      expect(testAUI.getTools()).toHaveLength(0);
    });
  });

  describe('Tool Execution', () => {
    it('should execute tools by name', async () => {
      testAUI
        .tool('executable')
        .input(z.object({ x: z.number() }))
        .execute(async ({ input }) => input.x * 2);

      const result = await testAUI.execute('executable', { x: 5 });
      expect(result).toBe(10);
    });

    it('should throw error for non-existent tool', async () => {
      await expect(testAUI.execute('nonexistent', {})).rejects.toThrow('Tool "nonexistent" not found');
    });

    it('should use context in execution', async () => {
      const tool = testAUI
        .tool('contextual')
        .execute(async ({ input, ctx }) => {
          if (ctx) {
            ctx.cache.set('key', 'value');
            return ctx.cache.get('key');
          }
          return null;
        });

      const ctx = testAUI.createContext();
      const result = await testAUI.execute('contextual', {}, ctx);
      expect(result).toBe('value');
      expect(ctx.cache.get('key')).toBe('value');
    });
  });

  describe('Context Management', () => {
    it('should create context with defaults', () => {
      const ctx = testAUI.createContext();
      
      expect(ctx.cache).toBeInstanceOf(Map);
      expect(ctx.fetch).toBeDefined();
      expect(ctx.user).toBeUndefined();
      expect(ctx.session).toBeUndefined();
    });

    it('should create context with additions', () => {
      const ctx = testAUI.createContext({
        user: { id: '123', name: 'Test User' },
        session: { token: 'abc' },
        env: { API_KEY: 'secret' }
      });
      
      expect(ctx.user).toEqual({ id: '123', name: 'Test User' });
      expect(ctx.session).toEqual({ token: 'abc' });
      expect(ctx.env).toEqual({ API_KEY: 'secret' });
    });

    it('should support cache operations in context', async () => {
      const tool = testAUI
        .tool('cached')
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input);
          if (cached) return cached;
          
          const result = `computed: ${input}`;
          ctx.cache.set(input, result);
          return result;
        });

      const ctx = testAUI.createContext();
      
      // First call - compute
      const result1 = await tool.run('test', ctx);
      expect(result1).toBe('computed: test');
      
      // Second call - from cache
      const result2 = await tool.run('test', ctx);
      expect(result2).toBe('computed: test');
      expect(ctx.cache.get('test')).toBe('computed: test');
    });
  });

  describe('Type Inference', () => {
    it('should properly type input and output', async () => {
      const tool = testAUI
        .tool('typed')
        .input(z.object({ 
          name: z.string(),
          count: z.number() 
        }))
        .execute(async ({ input }) => ({
          message: `${input.name} has ${input.count} items`,
          total: input.count * 2
        }));

      const result = await tool.run({ name: 'Test', count: 5 });
      
      // TypeScript should infer these types correctly
      expect(result.message).toBe('Test has 5 items');
      expect(result.total).toBe(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle execution errors', async () => {
      const tool = testAUI
        .tool('failing')
        .execute(async () => {
          throw new Error('Execution failed');
        });

      await expect(tool.run({})).rejects.toThrow('Execution failed');
    });

    it('should handle validation errors', async () => {
      const tool = testAUI
        .tool('strict')
        .input(z.object({ required: z.string() }))
        .execute(async ({ input }) => input.required);

      await expect(tool.run({} as any)).rejects.toThrow();
      await expect(tool.run({ required: 123 } as any)).rejects.toThrow();
    });

    it('should throw error for tool without execute handler', async () => {
      const tool = testAUI.tool('incomplete') as any;
      
      await expect(tool.run({})).rejects.toThrow('Tool incomplete has no execute handler');
    });
  });

  describe('Fluent Interface', () => {
    it('should support method chaining', async () => {
      const result = await testAUI
        .tool('fluent')
        .input(z.object({ text: z.string() }))
        .execute(async ({ input }) => input.text.toUpperCase())
        .clientExecute(async ({ input }) => input.text.toLowerCase())
        .render(({ data }) => null as any)
        .run({ text: 'Hello' });

      expect(result).toBe('HELLO');
    });

    it('should not require build() method', () => {
      const tool = testAUI
        .tool('no-build')
        .input(z.string())
        .execute(async ({ input }) => `Result: ${input}`);

      // Tool is immediately usable without .build()
      expect(tool.name).toBe('no-build');
      expect(tool.schema).toBeDefined();
    });
  });

  describe('Tool Serialization', () => {
    it('should serialize tool configuration', () => {
      const tool = testAUI
        .tool('serializable')
        .input(z.object({ id: z.string() }))
        .execute(async () => 'result')
        .clientExecute(async () => 'client result')
        .render(() => null as any);

      const json = tool.toJSON();
      
      expect(json).toEqual({
        name: 'serializable',
        hasInput: true,
        hasExecute: true,
        hasClientExecute: true,
        hasRender: true
      });
    });
  });
});