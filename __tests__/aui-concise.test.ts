import aui, { Tool } from '@/lib/aui/aui-concise';
import { z } from 'zod';

describe('AUI Concise API', () => {
  beforeEach(() => {
    // Clear registry between tests
    aui.registry.clear();
    jest.clearAllMocks();
  });

  describe('Tool Builder', () => {
    it('should create a simple tool with just execute', async () => {
      const tool = aui
        .tool('simple')
        .execute(async () => ({ result: 'success' }));

      const result = await tool.run({});
      expect(result).toEqual({ result: 'success' });
    });

    it('should create a tool with input validation', async () => {
      const tool = aui
        .tool('validated')
        .input(z.object({ name: z.string() }))
        .execute(async ({ input }) => ({ greeting: `Hello ${input.name}` }));

      const result = await tool.run({ name: 'World' });
      expect(result).toEqual({ greeting: 'Hello World' });

      // Should throw on invalid input
      await expect(tool.run({ name: 123 as any })).rejects.toThrow();
    });

    it('should support method chaining', () => {
      const tool = aui
        .tool('chained')
        .description('A chained tool')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ doubled: input.value * 2 }))
        .cache(1000)
        .retry(3)
        .timeout(5000);

      expect(tool.definition.name).toBe('chained');
      expect(tool.definition.description).toBe('A chained tool');
      expect(tool.definition.cache).toBe(1000);
      expect(tool.definition.retry).toBe(3);
      expect(tool.definition.timeout).toBe(5000);
    });
  });

  describe('Caching', () => {
    it('should cache results', async () => {
      let callCount = 0;
      const tool = aui
        .tool('cached')
        .input(z.object({ id: z.number() }))
        .execute(async ({ input }) => {
          callCount++;
          return { id: input.id, count: callCount };
        })
        .cache(1000);

      const result1 = await tool.run({ id: 1 });
      const result2 = await tool.run({ id: 1 });
      
      expect(result1).toEqual(result2);
      expect(callCount).toBe(1);
    });

    it('should expire cache after TTL', async () => {
      jest.useFakeTimers();
      let callCount = 0;
      
      const tool = aui
        .tool('expiring')
        .execute(async () => {
          callCount++;
          return { count: callCount };
        })
        .cache(100);

      await tool.run({});
      expect(callCount).toBe(1);

      // Advance time past TTL
      jest.advanceTimersByTime(150);
      
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
          if (attempts < 3) throw new Error('Temporary failure');
          return { success: true };
        })
        .retry(3);

      const result = await tool.run({});
      expect(result).toEqual({ success: true });
      expect(attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      const tool = aui
        .tool('failing')
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
          await new Promise(resolve => setTimeout(resolve, 1000));
          return { done: true };
        })
        .timeout(100);

      await expect(tool.run({})).rejects.toThrow('Timeout');
    });
  });

  describe('Middleware', () => {
    it('should execute middleware before main function', async () => {
      const events: string[] = [];
      
      const tool = aui
        .tool('with-middleware')
        .middleware(async () => {
          events.push('middleware1');
        })
        .middleware(async () => {
          events.push('middleware2');
        })
        .execute(async () => {
          events.push('execute');
          return { done: true };
        });

      await tool.run({});
      expect(events).toEqual(['middleware1', 'middleware2', 'execute']);
    });

    it('should pass context through middleware', async () => {
      let capturedContext: any;
      
      const tool = aui
        .tool('context-test')
        .middleware(async ({ ctx }) => {
          capturedContext = ctx;
        })
        .execute(async () => ({ done: true }));

      await tool.run({}, { aiAgent: 'test-agent', cache: new Map(), fetch });
      expect(capturedContext.aiAgent).toBe('test-agent');
    });
  });

  describe('Registry', () => {
    it('should register and retrieve tools', () => {
      const tool = aui.tool('registered').execute(async () => ({}));
      aui.register(tool);

      const retrieved = aui.get('registered');
      expect(retrieved).toBe(tool);
    });

    it('should list all registered tools', () => {
      const tool1 = aui.tool('tool1').description('First tool').execute(async () => ({}));
      const tool2 = aui.tool('tool2').description('Second tool').execute(async () => ({}));
      
      aui.register(tool1);
      aui.register(tool2);

      const list = aui.list();
      expect(list).toHaveLength(2);
      expect(list[0].name).toBe('tool1');
      expect(list[1].name).toBe('tool2');
    });

    it('should execute registered tools by name', async () => {
      const tool = aui
        .tool('executable')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ doubled: input.value * 2 }));
      
      aui.register(tool);

      const result = await aui.execute('executable', { value: 5 });
      expect(result).toEqual({ doubled: 10 });
    });
  });

  describe('Batch Execution', () => {
    it('should execute multiple tools in batch', async () => {
      const tool1 = aui
        .tool('batch1')
        .execute(async () => ({ result: 'one' }));
      
      const tool2 = aui
        .tool('batch2')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ result: input.value * 2 }));

      aui.register(tool1);
      aui.register(tool2);

      const results = await aui.batch([
        { tool: 'batch1', input: {} },
        { tool: 'batch2', input: { value: 10 } }
      ]);

      expect(results).toEqual([
        { result: 'one' },
        { result: 20 }
      ]);
    });
  });

  describe('Client/Server Execution', () => {
    it('should use clientExecute on client side', async () => {
      // Mock window object
      const originalWindow = global.window;
      global.window = {} as any;

      const tool = aui
        .tool('dual')
        .execute(async () => ({ from: 'server' }))
        .clientExecute(async () => ({ from: 'client' }));

      const result = await tool.run({});
      expect(result).toEqual({ from: 'client' });

      // Restore
      global.window = originalWindow;
    });

    it('should use execute on server side', async () => {
      // Ensure window is undefined
      const originalWindow = global.window;
      delete (global as any).window;

      const tool = aui
        .tool('dual')
        .execute(async () => ({ from: 'server' }))
        .clientExecute(async () => ({ from: 'client' }));

      const result = await tool.run({});
      expect(result).toEqual({ from: 'server' });

      // Restore
      global.window = originalWindow;
    });
  });

  describe('Permissions', () => {
    it('should set permissions on tool', () => {
      const tool = aui
        .tool('restricted')
        .permissions('read', 'write', 'admin')
        .execute(async () => ({}));

      expect(tool.definition.permissions).toEqual(['read', 'write', 'admin']);
    });
  });

  describe('Streaming', () => {
    it('should enable streaming mode', () => {
      const tool = aui
        .tool('streaming')
        .stream(true)
        .execute(async () => ({}));

      expect(tool.definition.stream).toBe(true);
    });

    it('should pass stream flag in context', async () => {
      let capturedContext: any;
      
      const tool = aui
        .tool('stream-context')
        .stream(true)
        .execute(async ({ ctx }) => {
          capturedContext = ctx;
          return {};
        });

      await tool.run({});
      expect(capturedContext?.stream).toBe(true);
    });
  });

  describe('Schema Export', () => {
    it('should export tool schema for AI discovery', () => {
      const tool = aui
        .tool('discoverable')
        .description('A tool for AI')
        .input(z.object({ query: z.string() }))
        .execute(async () => ({}))
        .clientExecute(async () => ({}))
        .cache(1000)
        .retry(3)
        .timeout(5000);

      const schema = tool.schema;
      expect(schema.name).toBe('discoverable');
      expect(schema.description).toBe('A tool for AI');
      expect(schema.features.hasClientExecution).toBe(true);
      expect(schema.features.hasCaching).toBe(true);
      expect(schema.features.hasRetry).toBe(true);
      expect(schema.features.hasTimeout).toBe(true);
    });
  });

  describe('Context Creation', () => {
    it('should create default context', () => {
      const ctx = aui.context();
      expect(ctx.cache).toBeInstanceOf(Map);
      expect(ctx.fetch).toBeDefined();
      expect(ctx.aiAgent).toBe('assistant');
    });

    it('should merge context overrides', () => {
      const ctx = aui.context({
        aiAgent: 'custom-agent',
        user: { id: 1, name: 'Test' },
        metadata: { key: 'value' }
      });

      expect(ctx.aiAgent).toBe('custom-agent');
      expect(ctx.user).toEqual({ id: 1, name: 'Test' });
      expect(ctx.metadata).toEqual({ key: 'value' });
    });
  });
});