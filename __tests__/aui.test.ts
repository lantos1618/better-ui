import { aui, z, Tool, createTool } from '../lib/aui/lantos-aui';

describe('Lantos AUI', () => {
  beforeEach(() => {
    aui.clear();
  });

  describe('Core Tool Building', () => {
    it('should create a simple tool with 2 methods', () => {
      const tool = aui
        .tool('simple')
        .input(z.object({ name: z.string() }))
        .execute(async ({ input }) => ({ greeting: `Hello ${input.name}` }));

      expect(tool.name).toBe('simple');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should execute a tool with valid input', async () => {
      const tool = aui
        .tool('greet')
        .input(z.object({ name: z.string() }))
        .execute(async ({ input }) => ({ message: `Hi ${input.name}` }));

      const result = await tool.run({ name: 'Alice' });
      expect(result).toEqual({ message: 'Hi Alice' });
    });

    it('should validate input schema', async () => {
      const tool = aui
        .tool('strict')
        .input(z.object({ age: z.number().min(0) }))
        .execute(async ({ input }) => ({ valid: true }));

      await expect(tool.run({ age: -1 })).rejects.toThrow();
      await expect(tool.run({ age: 25 })).resolves.toEqual({ valid: true });
    });

    it('should support client execution when context provided', async () => {
      const tool = aui
        .tool('cached')
        .input(z.object({ key: z.string() }))
        .execute(async ({ input }) => ({ source: 'server', key: input.key }))
        .clientExecute(async ({ input, ctx }) => {
          const cached = ctx.cache.get(input.key);
          if (cached) return cached;
          return { source: 'client', key: input.key };
        });

      const ctx = aui.createContext();
      ctx.cache.set('test', { source: 'cache', key: 'test' });
      
      const result = await tool.run({ key: 'test' }, ctx);
      expect(result).toEqual({ source: 'cache', key: 'test' });
    });
  });

  describe('Shorthand Methods', () => {
    it('should create a no-input tool with do()', async () => {
      const tool = aui.do('timestamp', () => ({ time: 123456 }));
      const result = await tool.run(undefined);
      expect(result).toEqual({ time: 123456 });
    });

    it('should create a tool with input using doWith()', async () => {
      const tool = aui.doWith(
        'multiply',
        z.object({ a: z.number(), b: z.number() }),
        ({ a, b }) => ({ result: a * b })
      );
      
      const result = await tool.run({ a: 3, b: 4 });
      expect(result).toEqual({ result: 12 });
    });

    it('should create a simple tool with all basics', async () => {
      const tool = aui.simple(
        'weather',
        z.object({ city: z.string() }),
        async (input) => ({ temp: 72, city: input.city }),
        (data) => null as any // Mock render
      );

      const result = await tool.run({ city: 'NYC' });
      expect(result).toEqual({ temp: 72, city: 'NYC' });
    });

    it('should use shorthand t() for tool()', () => {
      const tool1 = aui.t('test1');
      const tool2 = aui.tool('test2');
      
      expect(tool1).toBeInstanceOf(Tool);
      expect(tool2).toBeInstanceOf(Tool);
    });
  });

  describe('AI-Optimized Tools', () => {
    it('should create an AI tool with retry logic', async () => {
      let attempts = 0;
      const tool = aui.ai('flaky', {
        input: z.object({ value: z.string() }),
        execute: async ({ input }) => {
          attempts++;
          if (attempts < 2) throw new Error('Retry me');
          return { success: true, value: input.value };
        },
        retry: 3
      });

      const result = await tool.run({ value: 'test' });
      expect(result).toEqual({ success: true, value: 'test' });
      expect(attempts).toBe(2);
    });

    it('should cache results when cache enabled', async () => {
      let execCount = 0;
      const tool = aui.ai('cached-ai', {
        input: z.object({ query: z.string() }),
        execute: async ({ input }) => {
          execCount++;
          return { count: execCount, query: input.query };
        },
        cache: true
      });

      const ctx = aui.createContext();
      const result1 = await tool.run({ query: 'test' }, ctx);
      const result2 = await tool.run({ query: 'test' }, ctx);
      
      expect(result1).toEqual(result2);
      expect(execCount).toBe(1);
    });
  });

  describe('Tool Registry', () => {
    it('should register and retrieve tools', () => {
      const tool = aui.tool('registered');
      expect(aui.get('registered')).toBe(tool);
      expect(aui.has('registered')).toBe(true);
    });

    it('should list all tool names', () => {
      aui.tool('tool1');
      aui.tool('tool2');
      aui.tool('tool3');
      
      const names = aui.getToolNames();
      expect(names).toContain('tool1');
      expect(names).toContain('tool2');
      expect(names).toContain('tool3');
    });

    it('should execute tools by name', async () => {
      aui.tool('exec-test')
        .input(z.object({ x: z.number() }))
        .execute(async ({ input }) => ({ doubled: input.x * 2 }));

      const result = await aui.execute('exec-test', { x: 5 });
      expect(result).toEqual({ doubled: 10 });
    });

    it('should remove tools', () => {
      aui.tool('removable');
      expect(aui.has('removable')).toBe(true);
      
      aui.remove('removable');
      expect(aui.has('removable')).toBe(false);
    });

    it('should clear all tools', () => {
      aui.tool('tool1');
      aui.tool('tool2');
      expect(aui.getToolNames().length).toBe(2);
      
      aui.clear();
      expect(aui.getToolNames().length).toBe(0);
    });
  });

  describe('Batch Operations', () => {
    it('should define multiple tools at once', () => {
      const tools = aui.defineTools({
        add: {
          input: z.object({ a: z.number(), b: z.number() }),
          execute: async ({ input }) => ({ sum: input.a + input.b })
        },
        subtract: {
          input: z.object({ a: z.number(), b: z.number() }),
          execute: async ({ input }) => ({ diff: input.a - input.b })
        }
      });

      expect(tools.add).toBeInstanceOf(Tool);
      expect(tools.subtract).toBeInstanceOf(Tool);
      expect(aui.has('add')).toBe(true);
      expect(aui.has('subtract')).toBe(true);
    });

    it('should batch create simple tools', async () => {
      const tools = aui.batch({
        upper: (input: string) => input.toUpperCase(),
        lower: (input: string) => input.toLowerCase(),
        reverse: (input: string) => input.split('').reverse().join('')
      });

      expect(await tools.upper.run('hello')).toBe('HELLO');
      expect(await tools.lower.run('WORLD')).toBe('world');
      expect(await tools.reverse.run('abc')).toBe('cba');
    });

    it('should register multiple external tools', () => {
      const tool1 = createTool('external1');
      const tool2 = createTool('external2');
      
      aui.registerAll(tool1, tool2);
      
      expect(aui.has('external1')).toBe(true);
      expect(aui.has('external2')).toBe(true);
    });
  });

  describe('Context Management', () => {
    it('should create context with custom additions', () => {
      const customFetch = jest.fn();
      const ctx = aui.createContext({
        fetch: customFetch,
        user: { id: '123' }
      });

      expect(ctx.fetch).toBe(customFetch);
      expect(ctx.user).toEqual({ id: '123' });
      expect(ctx.cache).toBeInstanceOf(Map);
    });

    it('should provide default context', async () => {
      const tool = aui
        .tool('ctx-test')
        .execute(async ({ input, ctx }) => ({
          hasCache: ctx?.cache instanceof Map,
          hasFetch: typeof ctx?.fetch === 'function'
        }));

      const result = await aui.execute('ctx-test', {});
      expect(result.hasCache).toBe(true);
      expect(result.hasFetch).toBe(true);
    });
  });

  describe('Tool Export and Serialization', () => {
    it('should export tool definition', () => {
      const tool = aui
        .tool('exportable')
        .input(z.object({ id: z.string() }))
        .execute(async ({ input }) => ({ id: input.id }));

      const definition = tool.toDefinition();
      expect(definition.name).toBe('exportable');
      expect(definition.inputSchema).toBeDefined();
      expect(definition.execute).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent tool', async () => {
      await expect(aui.execute('nonexistent', {})).rejects.toThrow('Tool "nonexistent" not found');
    });

    it('should handle execution errors', async () => {
      const tool = aui
        .tool('error-tool')
        .execute(async () => {
          throw new Error('Execution failed');
        });

      await expect(tool.run({})).rejects.toThrow('Execution failed');
    });

    it('should retry on failure for AI tools', async () => {
      let attempts = 0;
      const tool = aui.ai('retry-test', {
        execute: async () => {
          attempts++;
          if (attempts < 3) throw new Error('Retry');
          return { attempts };
        },
        retry: 3
      });

      const result = await tool.run({});
      expect(result).toEqual({ attempts: 3 });
    });
  });

  describe('Standalone Tool Creation', () => {
    it('should create tools outside of aui instance', async () => {
      const tool = createTool('standalone')
        .input(z.object({ msg: z.string() }))
        .execute(async ({ input }) => ({ echo: input.msg }));

      const result = await tool.run({ msg: 'test' });
      expect(result).toEqual({ echo: 'test' });
    });
  });
});