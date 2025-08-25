import aui, { z, AUITool } from '../lib/aui';

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
      expect(tool).toBeDefined();
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

  describe('Tool Methods', () => {
    it('should create a tool without input', async () => {
      const tool = aui
        .tool('timestamp')
        .execute(async () => ({ time: 123456 }));
      const result = await tool.run(undefined as any);
      expect(result).toEqual({ time: 123456 });
    });

    it('should create a tool with input', async () => {
      const tool = aui
        .tool('multiply')
        .input(z.object({ a: z.number(), b: z.number() }))
        .execute(async ({ input }) => ({ result: input.a * input.b }));
      
      const result = await tool.run({ a: 3, b: 4 });
      expect(result).toEqual({ result: 12 });
    });

    it('should support render function', () => {
      const renderFn = jest.fn();
      const tool = aui
        .tool('weather')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({ temp: 72, city: input.city }))
        .render(renderFn);

      expect((tool as any).renderer).toBe(renderFn);
    });
  });

  describe('Client Execution', () => {
    it('should support client-side caching', async () => {
      let execCount = 0;
      const tool = aui
        .tool('cached')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => {
          execCount++;
          return { count: execCount, query: input.query };
        })
        .clientExecute(async ({ input, ctx }) => {
          const cacheKey = `query:${input.query}`;
          const cached = ctx.cache.get(cacheKey);
          if (cached) return cached;
          
          execCount++;
          const result = { count: execCount, query: input.query };
          ctx.cache.set(cacheKey, result);
          return result;
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

    it('should list all tools', () => {
      aui.tool('tool1');
      aui.tool('tool2');
      aui.tool('tool3');
      
      const tools = aui.getTools();
      expect(tools).toHaveLength(3);
      expect(tools.map((t: any) => t.name)).toContain('tool1');
      expect(tools.map((t: any) => t.name)).toContain('tool2');
      expect(tools.map((t: any) => t.name)).toContain('tool3');
    });

    it('should execute tools by name', async () => {
      aui.tool('exec-test')
        .input(z.object({ x: z.number() }))
        .execute(async ({ input }) => ({ doubled: input.x * 2 }));

      const result = await aui.execute('exec-test', { x: 5 });
      expect(result).toEqual({ doubled: 10 });
    });


    it('should clear all tools', () => {
      aui.tool('tool1');
      aui.tool('tool2');
      expect(aui.getTools().length).toBe(2);
      
      aui.clear();
      expect(aui.getTools().length).toBe(0);
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

  });

});