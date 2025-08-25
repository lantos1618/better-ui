import { z } from 'zod';
import { aui, LantosContext } from '../lib/aui/lantos';
import React from 'react';

describe('Lantos AUI Enhanced Features', () => {
  beforeEach(() => {
    // Clear registry between tests
    (aui as any).registry.clear();
  });

  describe('Middleware Support', () => {
    it('should execute middleware in order', async () => {
      const executionOrder: string[] = [];
      
      const tool = aui
        .tool('middleware-test')
        .input(z.object({ value: z.number() }))
        .use(async ({ input, next }) => {
          executionOrder.push('middleware-1-before');
          const result = await next();
          executionOrder.push('middleware-1-after');
          return result;
        })
        .use(async ({ input, next }) => {
          executionOrder.push('middleware-2-before');
          const result = await next();
          executionOrder.push('middleware-2-after');
          return result;
        })
        .execute(async ({ input }) => {
          executionOrder.push('execute');
          return { doubled: input.value * 2 };
        })
        .render(({ data }) => React.createElement('div', null, data.doubled));
      
      aui.register(tool);
      const result = await aui.execute('middleware-test', { value: 5 });
      
      expect(result).toEqual({ doubled: 10 });
      expect(executionOrder).toEqual([
        'middleware-1-before',
        'middleware-2-before',
        'execute',
        'middleware-2-after',
        'middleware-1-after'
      ]);
    });

    it('should handle middleware errors', async () => {
      const tool = aui
        .tool('error-middleware')
        .input(z.object({ value: z.number() }))
        .use(async ({ input, next }) => {
          if (input.value < 0) {
            throw new Error('Value must be positive');
          }
          return next();
        })
        .execute(async ({ input }) => ({ result: input.value }))
        .render(({ data }) => React.createElement('div', null, data.result));
      
      aui.register(tool);
      
      await expect(aui.execute('error-middleware', { value: -1 }))
        .rejects.toThrow('Value must be positive');
    });

    it('should allow middleware to modify results', async () => {
      const tool = aui
        .tool('transform-middleware')
        .input(z.object({ text: z.string() }))
        .use(async ({ input, next }) => {
          const result = await next();
          return { ...result, modified: true };
        })
        .execute(async ({ input }) => ({ text: input.text.toUpperCase() }))
        .render(({ data }) => React.createElement('div', null, data.text));
      
      aui.register(tool);
      const result = await aui.execute('transform-middleware', { text: 'hello' });
      
      expect(result).toEqual({ text: 'HELLO', modified: true });
    });
  });

  describe('Streaming Support', () => {
    it('should stream data chunks', async () => {
      const chunks: any[] = [];
      
      const tool = aui
        .tool('streaming-test')
        .input(z.object({ count: z.number() }))
        .execute(async ({ input }) => ({ total: input.count }))
        .stream(async function* ({ input }) {
          for (let i = 0; i < input.count; i++) {
            yield { index: i, value: `chunk-${i}` };
          }
        })
        .render(({ data }) => React.createElement('div', null, data.total));
      
      aui.register(tool);
      
      const generator = aui.stream('streaming-test', { count: 3 }, undefined, {
        onChunk: (chunk) => chunks.push(chunk)
      });
      
      const streamedChunks = [];
      for await (const chunk of generator) {
        streamedChunks.push(chunk);
      }
      
      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual({ index: 0, value: 'chunk-0' });
      expect(chunks[2]).toEqual({ index: 2, value: 'chunk-2' });
      expect(streamedChunks).toEqual(chunks);
    });

    it('should handle streaming errors', async () => {
      let errorCaught: Error | undefined;
      
      const tool = aui
        .tool('streaming-error')
        .input(z.object({ fail: z.boolean() }))
        .execute(async () => ({ result: 'ok' }))
        .stream(async function* ({ input }) {
          if (input.fail) {
            throw new Error('Stream failed');
          }
          yield { data: 'success' };
        })
        .render(({ data }) => React.createElement('div', null, 'ok'));
      
      aui.register(tool);
      
      try {
        const generator = aui.stream('streaming-error', { fail: true }, undefined, {
          onError: (error) => { errorCaught = error; }
        });
        
        for await (const chunk of generator) {
          // Should not reach here
        }
      } catch (error) {
        expect(error).toEqual(new Error('Stream failed'));
      }
      
      expect(errorCaught).toBeDefined();
      expect(errorCaught?.message).toBe('Stream failed');
    });

    it('should call completion callback', async () => {
      let completed = false;
      
      const tool = aui
        .tool('streaming-complete')
        .input(z.object({ data: z.string() }))
        .execute(async ({ input }) => ({ data: input.data }))
        .stream(async function* ({ input }) {
          yield { result: input.data };
        })
        .render(({ data }) => React.createElement('div', null, data.data));
      
      aui.register(tool);
      
      const generator = aui.stream('streaming-complete', { data: 'test' }, undefined, {
        onComplete: () => { completed = true; }
      });
      
      for await (const chunk of generator) {
        // Process chunks
      }
      
      expect(completed).toBe(true);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on failure', async () => {
      let attempts = 0;
      
      const tool = aui
        .tool('retry-test')
        .input(z.object({ failTimes: z.number() }))
        .retry(3, 10) // 3 retries with 10ms delay
        .execute(async ({ input }) => {
          attempts++;
          if (attempts <= input.failTimes) {
            throw new Error(`Attempt ${attempts} failed`);
          }
          return { attempts };
        })
        .render(({ data }) => React.createElement('div', null, data.attempts));
      
      aui.register(tool);
      
      const result = await aui.execute('retry-test', { failTimes: 2 });
      expect(result).toEqual({ attempts: 3 });
      expect(attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      let attempts = 0;
      
      const tool = aui
        .tool('retry-fail')
        .input(z.object({ value: z.number() }))
        .retry(2, 10)
        .execute(async () => {
          attempts++;
          throw new Error('Always fails');
        })
        .render(({ data }) => React.createElement('div', null, 'never'));
      
      aui.register(tool);
      
      await expect(aui.execute('retry-fail', { value: 1 }))
        .rejects.toThrow('Always fails');
      
      expect(attempts).toBe(3); // Initial + 2 retries
    });
  });

  describe('Batch Execution', () => {
    it('should execute multiple tools in batch', async () => {
      const tool1 = aui
        .tool('batch-1')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ doubled: input.value * 2 }))
        .render(({ data }) => React.createElement('div', null, data.doubled));
      
      const tool2 = aui
        .tool('batch-2')
        .input(z.object({ text: z.string() }))
        .execute(async ({ input }) => ({ upper: input.text.toUpperCase() }))
        .render(({ data }) => React.createElement('div', null, data.upper));
      
      aui.register(tool1);
      aui.register(tool2);
      
      const results = await aui.executeBatch([
        { name: 'batch-1', input: { value: 5 } },
        { name: 'batch-2', input: { text: 'hello' } }
      ]);
      
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ success: true, data: { doubled: 10 } });
      expect(results[1]).toEqual({ success: true, data: { upper: 'HELLO' } });
    });

    it('should handle batch execution with failures', async () => {
      const tool1 = aui
        .tool('batch-success')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ result: input.value }))
        .render(({ data }) => React.createElement('div', null, data.result));
      
      const tool2 = aui
        .tool('batch-fail')
        .input(z.object({ value: z.number() }))
        .execute(async () => {
          throw new Error('Tool failed');
        })
        .render(({ data }) => React.createElement('div', null, 'never'));
      
      aui.register(tool1);
      aui.register(tool2);
      
      const results = await aui.executeBatch([
        { name: 'batch-success', input: { value: 10 } },
        { name: 'batch-fail', input: { value: 20 } }
      ]);
      
      expect(results[0]).toEqual({ success: true, data: { result: 10 } });
      expect(results[1].success).toBe(false);
      expect(results[1].error?.message).toBe('Tool failed');
    });
  });

  describe('Metadata and Documentation', () => {
    it('should store and retrieve tool metadata', () => {
      const tool = aui
        .tool('metadata-test')
        .describe('A test tool with metadata')
        .meta({ version: '1.0.0', author: 'Test Author' })
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ result: input.value }))
        .render(({ data }) => React.createElement('div', null, data.result));
      
      aui.register(tool);
      const retrieved = aui.get('metadata-test');
      
      expect(retrieved?.description).toBe('A test tool with metadata');
      expect(retrieved?.metadata).toEqual({
        version: '1.0.0',
        author: 'Test Author'
      });
    });

    it('should merge metadata from multiple calls', () => {
      const tool = aui
        .tool('metadata-merge')
        .meta({ version: '1.0.0' })
        .meta({ author: 'Test' })
        .meta({ category: 'testing' })
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ result: input.value }))
        .render(({ data }) => React.createElement('div', null, data.result));
      
      aui.register(tool);
      const retrieved = aui.get('metadata-merge');
      
      expect(retrieved?.metadata).toEqual({
        version: '1.0.0',
        author: 'Test',
        category: 'testing'
      });
    });
  });

  describe('Enhanced Context', () => {
    it('should provide abort signal in context', async () => {
      const controller = new AbortController();
      const ctx: LantosContext = {
        cache: new Map(),
        fetch: async () => ({}),
        abortSignal: controller.signal
      };
      
      const tool = aui
        .tool('abort-test')
        .input(z.object({ value: z.number() }))
        .clientExecute(async ({ input, ctx }) => {
          if (ctx.abortSignal?.aborted) {
            throw new Error('Aborted');
          }
          return { result: input.value };
        })
        .execute(async ({ input }) => ({ result: input.value }))
        .render(({ data }) => React.createElement('div', null, data.result));
      
      aui.register(tool);
      
      // In browser environment, clientExecute would be used
      if (typeof window !== 'undefined') {
        controller.abort();
        await expect(aui.execute('abort-test', { value: 5 }, ctx))
          .rejects.toThrow('Aborted');
      }
    });

    it('should track metrics in context', async () => {
      const ctx: LantosContext = {
        cache: new Map(),
        fetch: async () => ({}),
        metrics: { startTime: Date.now() }
      };
      
      const tool = aui
        .tool('metrics-test')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input, ctx }) => {
          if (ctx?.metrics) {
            ctx.metrics.endTime = Date.now();
            ctx.metrics.duration = ctx.metrics.endTime - ctx.metrics.startTime;
          }
          return { result: input.value };
        })
        .render(({ data }) => React.createElement('div', null, data.result));
      
      aui.register(tool);
      
      await aui.execute('metrics-test', { value: 10 }, ctx);
      
      expect(ctx.metrics?.duration).toBeDefined();
      expect(ctx.metrics?.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Enhanced Render Props', () => {
    it('should pass loading state to render', () => {
      const tool = aui
        .tool('render-props')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ result: input.value }))
        .render(({ data, loading, error }) => {
          if (loading) return React.createElement('div', null, 'Loading...');
          if (error) return React.createElement('div', null, `Error: ${error.message}`);
          return React.createElement('div', null, data?.result);
        });
      
      const renderResult = tool.render({ 
        data: undefined as any, 
        loading: true, 
        error: undefined 
      });
      
      expect(renderResult.props.children).toBe('Loading...');
    });

    it('should pass error state to render', () => {
      const tool = aui
        .tool('render-error')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ result: input.value }))
        .render(({ data, loading, error }) => {
          if (error) return React.createElement('div', null, `Error: ${error.message}`);
          return React.createElement('div', null, data?.result);
        });
      
      const renderResult = tool.render({ 
        data: undefined as any, 
        loading: false, 
        error: new Error('Test error') 
      });
      
      expect(renderResult.props.children).toBe('Error: Test error');
    });
  });
});