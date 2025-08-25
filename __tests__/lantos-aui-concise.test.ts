import aui from '@/lib/aui/lantos-concise';
import { z } from 'zod';

describe('Lantos AUI - Concise API', () => {
  beforeEach(() => {
    // Clear registry between tests
    aui.registry.clear();
  });

  describe('Tool Creation', () => {
    it('should create a simple tool with just execute', async () => {
      const tool = aui
        .tool('simple')
        .execute(async () => 'result');
      
      const result = await tool.run({});
      expect(result).toBe('result');
    });

    it('should create a tool with input validation', async () => {
      const tool = aui
        .tool('validated')
        .input(z.object({ name: z.string() }))
        .execute(async ({ input }) => `Hello ${input.name}`);
      
      const result = await tool.run({ name: 'World' });
      expect(result).toBe('Hello World');
      
      // Should throw on invalid input
      await expect(tool.run({ name: 123 } as any)).rejects.toThrow();
    });

    it('should support description', () => {
      const tool = aui
        .tool('described')
        .description('A test tool')
        .execute(async () => 'test');
      
      expect(tool.schema.description).toBe('A test tool');
    });
  });

  describe('Client/Server Execution', () => {
    it('should use server execute when no client execute defined', async () => {
      const serverFn = jest.fn(async () => 'server');
      
      const tool = aui
        .tool('server-only')
        .execute(serverFn);
      
      const result = await tool.run({});
      expect(result).toBe('server');
      expect(serverFn).toHaveBeenCalled();
    });

    it('should use client execute when available in browser', async () => {
      // Mock browser environment
      const originalWindow = global.window;
      global.window = {} as any;
      
      const serverFn = jest.fn(async () => 'server');
      const clientFn = jest.fn(async () => 'client');
      
      const tool = aui
        .tool('client-server')
        .execute(serverFn)
        .clientExecute(clientFn);
      
      const result = await tool.run({});
      expect(result).toBe('client');
      expect(clientFn).toHaveBeenCalled();
      expect(serverFn).not.toHaveBeenCalled();
      
      // Restore
      global.window = originalWindow;
    });
  });

  describe('Caching', () => {
    it('should cache results when cache TTL is set', async () => {
      let callCount = 0;
      const tool = aui
        .tool('cached')
        .input(z.object({ id: z.number() }))
        .execute(async ({ input }) => {
          callCount++;
          return `Result ${input.id}`;
        })
        .cache(1000); // 1 second cache
      
      // First call
      const result1 = await tool.run({ id: 1 });
      expect(result1).toBe('Result 1');
      expect(callCount).toBe(1);
      
      // Second call (should be cached)
      const result2 = await tool.run({ id: 1 });
      expect(result2).toBe('Result 1');
      expect(callCount).toBe(1); // Should not increment
      
      // Different input (not cached)
      const result3 = await tool.run({ id: 2 });
      expect(result3).toBe('Result 2');
      expect(callCount).toBe(2);
    });

    it('should expire cache after TTL', async () => {
      jest.useFakeTimers();
      
      let callCount = 0;
      const tool = aui
        .tool('expiring-cache')
        .execute(async () => {
          callCount++;
          return 'result';
        })
        .cache(1000); // 1 second cache
      
      await tool.run({});
      expect(callCount).toBe(1);
      
      // Before expiry
      await tool.run({});
      expect(callCount).toBe(1);
      
      // Advance time past TTL
      jest.advanceTimersByTime(1100);
      
      // After expiry
      await tool.run({});
      expect(callCount).toBe(2);
      
      jest.useRealTimers();
    });
  });

  describe('Retry Logic', () => {
    it('should retry on failure', async () => {
      let attempts = 0;
      const tool = aui
        .tool('retry')
        .execute(async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Fail');
          }
          return 'success';
        })
        .retry(3);
      
      const result = await tool.run({});
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      const tool = aui
        .tool('always-fail')
        .execute(async () => {
          throw new Error('Always fails');
        })
        .retry(2);
      
      await expect(tool.run({})).rejects.toThrow('Always fails');
    });
  });

  describe('Timeout', () => {
    it('should timeout long-running operations', async () => {
      const tool = aui
        .tool('slow')
        .execute(async () => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          return 'complete';
        })
        .timeout(100); // 100ms timeout
      
      await expect(tool.run({})).rejects.toThrow('Timeout');
    });

    it('should complete fast operations before timeout', async () => {
      const tool = aui
        .tool('fast')
        .execute(async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'complete';
        })
        .timeout(1000);
      
      const result = await tool.run({});
      expect(result).toBe('complete');
    });
  });

  describe('Tool Registry', () => {
    it('should register and retrieve tools', () => {
      const tool = aui.tool('registered').execute(async () => 'test');
      aui.register(tool);
      
      const retrieved = aui.get('registered');
      expect(retrieved).toBe(tool);
    });

    it('should list all registered tools', () => {
      const tool1 = aui.tool('tool1').description('First tool').execute(async () => 1);
      const tool2 = aui.tool('tool2').description('Second tool').execute(async () => 2);
      
      aui.register(tool1);
      aui.register(tool2);
      
      const list = aui.list();
      expect(list).toHaveLength(2);
      expect(list[0].name).toBe('tool1');
      expect(list[0].description).toBe('First tool');
      expect(list[1].name).toBe('tool2');
      expect(list[1].description).toBe('Second tool');
    });

    it('should execute registered tools by name', async () => {
      const tool = aui
        .tool('executable')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => input.value * 2);
      
      aui.register(tool);
      
      const result = await aui.execute('executable', { value: 5 });
      expect(result).toBe(10);
    });

    it('should throw when executing non-existent tool', async () => {
      await expect(aui.execute('non-existent', {})).rejects.toThrow('Tool non-existent not found');
    });
  });

  describe('Batch Execution', () => {
    it('should execute multiple tools in batch', async () => {
      const tool1 = aui.tool('batch1').execute(async () => 'result1');
      const tool2 = aui.tool('batch2').execute(async () => 'result2');
      
      aui.register(tool1);
      aui.register(tool2);
      
      const results = await aui.batch([
        { tool: 'batch1', input: {} },
        { tool: 'batch2', input: {} }
      ]);
      
      expect(results).toEqual(['result1', 'result2']);
    });
  });

  describe('Context Management', () => {
    it('should create context with defaults', () => {
      const ctx = aui.context();
      
      expect(ctx.cache).toBeInstanceOf(Map);
      expect(ctx.fetch).toBeDefined();
      expect(ctx.aiAgent).toBe('assistant');
    });

    it('should create context with overrides', () => {
      const customFetch = jest.fn();
      const ctx = aui.context({
        user: { id: 1 },
        session: { token: 'abc' },
        aiAgent: 'custom',
        fetch: customFetch
      });
      
      expect(ctx.user).toEqual({ id: 1 });
      expect(ctx.session).toEqual({ token: 'abc' });
      expect(ctx.aiAgent).toBe('custom');
      expect(ctx.fetch).toBe(customFetch);
    });

    it('should pass context to execute function', async () => {
      let receivedCtx: any;
      
      const tool = aui
        .tool('context-test')
        .execute(async ({ ctx }) => {
          receivedCtx = ctx;
          return 'done';
        });
      
      const customCtx = aui.context({ user: { id: 123 } });
      await tool.run({}, customCtx);
      
      expect(receivedCtx.user).toEqual({ id: 123 });
    });
  });

  describe('Schema Export', () => {
    it('should export tool schema for AI discovery', () => {
      const tool = aui
        .tool('ai-discoverable')
        .description('A tool for AI')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => input.query)
        .clientExecute(async ({ input }) => input.query)
        .cache(5000)
        .retry(3)
        .timeout(10000);
      
      const schema = tool.schema;
      
      expect(schema.name).toBe('ai-discoverable');
      expect(schema.description).toBe('A tool for AI');
      expect(schema.input).toBeDefined();
      expect(schema.features.hasClientExecution).toBe(true);
      expect(schema.features.hasCaching).toBe(true);
      expect(schema.features.hasRetry).toBe(true);
      expect(schema.features.hasTimeout).toBe(true);
      expect(schema.features.hasRender).toBe(false);
    });
  });
});