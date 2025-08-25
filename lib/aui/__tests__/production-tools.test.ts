import aui from '../index';
import { z } from 'zod';

describe('Production AUI Tools', () => {
  beforeEach(() => {
    aui.clear();
  });

  describe('Production Tool Patterns', () => {
    it('should handle API gateway pattern with retry and caching', async () => {
      const apiGatewayTool = aui
        .tool('api-gateway')
        .input(z.object({
          endpoint: z.string(),
          method: z.enum(['GET', 'POST']),
          cacheKey: z.string().optional()
        }))
        .clientExecute(async ({ input, ctx }) => {
          if (input.method === 'GET' && input.cacheKey) {
            const cached = ctx.cache.get(input.cacheKey);
            if (cached) return cached;
          }

          const data = { response: 'mocked' };
          
          if (input.method === 'GET' && input.cacheKey) {
            ctx.cache.set(input.cacheKey, data);
          }

          return data;
        });

      const ctx = {
        cache: new Map(),
        fetch: jest.fn(),
        isServer: false
      };

      // First call - should fetch
      const result1 = await apiGatewayTool.run(
        { endpoint: '/api/test', method: 'GET', cacheKey: 'test-key' },
        ctx
      );
      expect(result1).toEqual({ response: 'mocked' });

      // Second call - should use cache
      const result2 = await apiGatewayTool.run(
        { endpoint: '/api/test', method: 'GET', cacheKey: 'test-key' },
        ctx
      );
      expect(result2).toEqual({ response: 'mocked' });
      expect(ctx.cache.has('test-key')).toBe(true);
    });

    it('should handle state management pattern', async () => {
      const stateManagerTool = aui
        .tool('state-manager')
        .input(z.object({
          action: z.enum(['get', 'set', 'update']),
          key: z.string().optional(),
          value: z.any().optional()
        }))
        .clientExecute(async ({ input, ctx }) => {
          const state = ctx.cache.get('__app_state__') || {};

          switch (input.action) {
            case 'get':
              return input.key ? state[input.key] : state;
            case 'set':
              state[input.key!] = input.value;
              ctx.cache.set('__app_state__', state);
              return { success: true, value: input.value };
            case 'update':
              state[input.key!] = { ...state[input.key!], ...input.value };
              ctx.cache.set('__app_state__', state);
              return { success: true, value: state[input.key!] };
            default:
              throw new Error('Unknown action');
          }
        });

      const ctx = {
        cache: new Map(),
        fetch: jest.fn(),
        isServer: false
      };

      // Set state
      await stateManagerTool.run(
        { action: 'set', key: 'user', value: { name: 'John' } },
        ctx
      );

      // Get state
      const result = await stateManagerTool.run(
        { action: 'get', key: 'user' },
        ctx
      );

      expect(result).toEqual({ name: 'John' });

      // Update state
      await stateManagerTool.run(
        { action: 'update', key: 'user', value: { age: 30 } },
        ctx
      );

      const updated = await stateManagerTool.run(
        { action: 'get', key: 'user' },
        ctx
      );

      expect(updated).toEqual({ name: 'John', age: 30 });
    });

    it('should handle analytics tracking with batching', async () => {
      const analyticsTool = aui
        .tool('analytics')
        .input(z.object({
          event: z.string(),
          properties: z.record(z.any()).optional()
        }))
        .clientExecute(async ({ input, ctx }) => {
          const queue = ctx.cache.get('__analytics_queue__') || [];
          queue.push(input);
          ctx.cache.set('__analytics_queue__', queue);

          if (queue.length >= 3) {
            // Batch send
            ctx.cache.set('__analytics_queue__', []);
            return { batched: true, count: queue.length };
          }

          return { queued: true, queueLength: queue.length };
        });

      const ctx = {
        cache: new Map(),
        fetch: jest.fn(),
        isServer: false
      };

      // Queue events
      const result1 = await analyticsTool.run({ event: 'click' }, ctx);
      expect(result1).toEqual({ queued: true, queueLength: 1 });

      const result2 = await analyticsTool.run({ event: 'view' }, ctx);
      expect(result2).toEqual({ queued: true, queueLength: 2 });

      // Third event triggers batch
      const result3 = await analyticsTool.run({ event: 'submit' }, ctx);
      expect(result3).toEqual({ batched: true, count: 3 });
      
      // Queue should be cleared
      const queue = ctx.cache.get('__analytics_queue__');
      expect(queue).toEqual([]);
    });
  });
});