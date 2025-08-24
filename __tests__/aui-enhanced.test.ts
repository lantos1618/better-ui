import { describe, it, expect, beforeEach } from '@jest/globals';
import aui, { z } from '@/lib/aui-enhanced';

describe('AUI Enhanced', () => {
  beforeEach(() => {
    aui.clearCache();
  });

  describe('Basic Tool Creation', () => {
    it('should create a simple tool', async () => {
      const tool = aui
        .tool('test')
        .input(z.object({ value: z.string() }))
        .execute(async ({ input }) => ({ result: input.value.toUpperCase() }));

      const result = await tool.run({ value: 'hello' });
      expect(result).toEqual({ result: 'HELLO' });
    });

    it('should validate input schema', async () => {
      const tool = aui
        .tool('validate')
        .input(z.object({ 
          name: z.string().min(3),
          age: z.number().positive()
        }))
        .execute(async ({ input }) => input);

      await expect(tool.run({ name: 'ab', age: 25 })).rejects.toThrow();
      await expect(tool.run({ name: 'Alice', age: -5 })).rejects.toThrow();
      
      const result = await tool.run({ name: 'Alice', age: 25 });
      expect(result).toEqual({ name: 'Alice', age: 25 });
    });
  });

  describe('Client/Server Execution', () => {
    it('should use server execution by default', async () => {
      let serverCalled = false;
      let clientCalled = false;

      const tool = aui
        .tool('dual')
        .execute(async () => {
          serverCalled = true;
          return 'server';
        })
        .clientExecute(async () => {
          clientCalled = true;
          return 'client';
        });

      const result = await tool.run({});
      expect(result).toBe('server');
      expect(serverCalled).toBe(true);
      expect(clientCalled).toBe(false);
    });

    it('should use client execution when in browser context', async () => {
      let serverCalled = false;
      let clientCalled = false;

      const tool = aui
        .tool('dual2')
        .execute(async () => {
          serverCalled = true;
          return 'server';
        })
        .clientExecute(async () => {
          clientCalled = true;
          return 'client';
        });

      const result = await tool.run({}, { isClient: true, cache: new Map(), fetch });
      expect(result).toBe('client');
      expect(clientCalled).toBe(true);
      expect(serverCalled).toBe(false);
    });
  });

  describe('Caching', () => {
    it('should cache results when enabled', async () => {
      let executionCount = 0;
      const ctx = { cache: new Map(), fetch };

      const tool = aui
        .tool('cached')
        .input(z.object({ id: z.string() }))
        .execute(async ({ input }) => {
          executionCount++;
          return { id: input.id, count: executionCount };
        })
        .cache(true);

      const result1 = await tool.run({ id: 'test' }, ctx);
      const result2 = await tool.run({ id: 'test' }, ctx);
      const result3 = await tool.run({ id: 'different' }, ctx);

      expect(result1.count).toBe(1);
      expect(result2.count).toBe(1); // Should use cached value
      expect(result3.count).toBe(2); // Different input, new execution
      expect(executionCount).toBe(2);
    });

    it('should respect cache TTL', async () => {
      const ctx = { cache: new Map(), fetch };

      const tool = aui
        .tool('ttl')
        .execute(async () => ({ timestamp: Date.now() }))
        .cache(100); // 100ms TTL

      const result1 = await tool.run({}, ctx);
      const result2 = await tool.run({}, ctx);
      
      expect(result1.timestamp).toBe(result2.timestamp);

      await new Promise(resolve => setTimeout(resolve, 150));
      
      const result3 = await tool.run({}, ctx);
      expect(result3.timestamp).toBeGreaterThan(result1.timestamp);
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
            throw new Error('Temporary failure');
          }
          return { success: true, attempts };
        })
        .retry(3);

      const result = await tool.run({});
      expect(result).toEqual({ success: true, attempts: 3 });
      expect(attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      let attempts = 0;

      const tool = aui
        .tool('fail')
        .execute(async () => {
          attempts++;
          throw new Error('Permanent failure');
        })
        .retry(2);

      await expect(tool.run({})).rejects.toThrow('Permanent failure');
      expect(attempts).toBe(2);
    });
  });

  describe('Timeout', () => {
    it('should timeout long-running operations', async () => {
      const tool = aui
        .tool('slow')
        .execute(async () => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return 'completed';
        })
        .timeout(100);

      await expect(tool.run({})).rejects.toThrow('Timeout');
    });

    it('should complete before timeout', async () => {
      const tool = aui
        .tool('fast')
        .execute(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'completed';
        })
        .timeout(200);

      const result = await tool.run({});
      expect(result).toBe('completed');
    });
  });

  describe('Error Handling', () => {
    it('should call error handler on failure', async () => {
      let errorHandled = false;
      let capturedError: Error | null = null;
      let capturedInput: any = null;

      const tool = aui
        .tool('error')
        .input(z.object({ value: z.string() }))
        .execute(async () => {
          throw new Error('Test error');
        })
        .onError((error, input) => {
          errorHandled = true;
          capturedError = error;
          capturedInput = input;
        });

      await expect(tool.run({ value: 'test' })).rejects.toThrow('Test error');
      expect(errorHandled).toBe(true);
      expect(capturedError?.message).toBe('Test error');
      expect(capturedInput).toEqual({ value: 'test' });
    });
  });

  describe('Batch Execution', () => {
    it('should execute multiple tools in parallel', async () => {
      aui.tool('batch1').execute(async () => ({ result: 'one' }));
      aui.tool('batch2').execute(async () => ({ result: 'two' }));
      aui.tool('batch3').execute(async () => ({ result: 'three' }));

      const results = await aui.batch([
        { tool: 'batch1', input: {} },
        { tool: 'batch2', input: {} },
        { tool: 'batch3', input: {} }
      ]);

      expect(results).toEqual([
        { result: 'one' },
        { result: 'two' },
        { result: 'three' }
      ]);
    });
  });

  describe('Context Management', () => {
    it('should use global context', async () => {
      aui.setContext({
        user: { id: '123', name: 'Test User' },
        session: { token: 'abc' }
      });

      const tool = aui
        .tool('context')
        .execute(async ({ ctx }) => ({
          user: ctx?.user,
          session: ctx?.session
        }));

      const result = await tool.run({});
      expect(result.user).toEqual({ id: '123', name: 'Test User' });
      expect(result.session).toEqual({ token: 'abc' });
    });

    it('should merge context on execution', async () => {
      aui.setContext({ user: { id: '123' } });

      const tool = aui
        .tool('merge')
        .execute(async ({ ctx }) => ctx);

      const result = await tool.run({}, { session: { token: 'xyz' } });
      expect(result.user).toEqual({ id: '123' });
      expect(result.session).toEqual({ token: 'xyz' });
    });
  });

  describe('Tool Registry', () => {
    it('should list all registered tools', () => {
      aui.tool('tool1').execute(async () => 'one');
      aui.tool('tool2').execute(async () => 'two');
      aui.tool('tool3').execute(async () => 'three');

      const tools = aui.list();
      expect(tools).toContain('tool1');
      expect(tools).toContain('tool2');
      expect(tools).toContain('tool3');
    });

    it('should get tool by name', () => {
      const created = aui.tool('findme').execute(async () => 'found');
      const found = aui.get('findme');
      
      expect(found).toBeDefined();
      expect(found?.name).toBe('findme');
    });

    it('should execute by name', async () => {
      aui
        .tool('byname')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => input.value * 2);

      const result = await aui.execute('byname', { value: 5 });
      expect(result).toBe(10);
    });
  });
});