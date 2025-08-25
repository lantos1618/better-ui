import aui from '../index';
import { z } from 'zod';
import { ServerExecutor } from '../server-executor';

describe('AUI Integration Tests', () => {
  beforeEach(() => {
    aui.clear();
  });
  
  describe('Simple Tool Creation', () => {
    it('should create a simple tool with just input and execute', async () => {
      const tool = aui
        .tool('simple')
        .input(z.object({ value: z.number() }))
        .execute(async ({ input }) => ({ result: input.value * 2 }));
      
      const result = await tool.run({ value: 5 });
      expect(result).toEqual({ result: 10 });
    });
    
    it('should work without input schema', async () => {
      const tool = aui
        .tool('noSchema')
        .execute(async ({ input }) => ({ received: input }));
      
      const result = await tool.run({ anything: 'works' });
      expect(result).toEqual({ received: { anything: 'works' } });
    });
  });
  
  describe('Client and Server Execution', () => {
    it('should use server execution by default', async () => {
      const serverFn = jest.fn(async ({ input }) => ({ server: true, value: input }));
      const clientFn = jest.fn(async ({ input }) => ({ client: true, value: input }));
      
      const tool = aui
        .tool('dual')
        .execute(serverFn)
        .clientExecute(clientFn);
      
      // Default context is server
      const result = await tool.run({ test: 1 });
      
      expect(serverFn).toHaveBeenCalled();
      expect(clientFn).not.toHaveBeenCalled();
      expect(result).toEqual({ server: true, value: { test: 1 } });
    });
    
    it('should use client execution when isServer is false', async () => {
      const serverFn = jest.fn(async ({ input }) => ({ server: true }));
      const clientFn = jest.fn(async ({ input }) => ({ client: true }));
      
      const tool = aui
        .tool('dual')
        .execute(serverFn)
        .clientExecute(clientFn);
      
      const result = await tool.run({}, { isServer: false, cache: new Map(), fetch });
      
      expect(serverFn).not.toHaveBeenCalled();
      expect(clientFn).toHaveBeenCalled();
      expect(result).toEqual({ client: true });
    });
  });
  
  describe('Context and Caching', () => {
    it('should pass context to execution handlers', async () => {
      const tool = aui
        .tool('contextTest')
        .execute(async ({ input, ctx }) => ({
          hasCache: ctx?.cache instanceof Map,
          hasFetch: typeof ctx?.fetch === 'function',
          isServer: ctx?.isServer
        }));
      
      const result = await tool.run({});
      expect(result.hasCache).toBe(true);
      expect(result.hasFetch).toBe(true);
      expect(result.isServer).toBe(true);
    });
    
    it('should support caching in client execution', async () => {
      const cache = new Map();
      let callCount = 0;
      
      const tool = aui
        .tool('cached')
        .input(z.object({ key: z.string() }))
        .clientExecute(async ({ input, ctx }) => {
          if (ctx.cache.has(input.key)) {
            return ctx.cache.get(input.key);
          }
          callCount++;
          const result = { value: callCount, key: input.key };
          ctx.cache.set(input.key, result);
          return result;
        });
      
      const ctx = { cache, fetch, isServer: false };
      
      const result1 = await tool.run({ key: 'test' }, ctx);
      const result2 = await tool.run({ key: 'test' }, ctx);
      const result3 = await tool.run({ key: 'other' }, ctx);
      
      expect(result1).toEqual({ value: 1, key: 'test' });
      expect(result2).toEqual({ value: 1, key: 'test' }); // Cached
      expect(result3).toEqual({ value: 2, key: 'other' });
      expect(callCount).toBe(2);
    });
  });
  
  describe('Middleware', () => {
    it('should execute middleware in order', async () => {
      const order: string[] = [];
      
      const tool = aui
        .tool('middleware')
        .execute(async ({ input }) => {
          order.push('execute');
          return { result: input };
        })
        .middleware(async ({ input, next }) => {
          order.push('middleware1-before');
          const result = await next();
          order.push('middleware1-after');
          return result;
        })
        .middleware(async ({ input, next }) => {
          order.push('middleware2-before');
          const result = await next();
          order.push('middleware2-after');
          return result;
        });
      
      await tool.run({ test: 1 });
      
      expect(order).toEqual([
        'middleware1-before',
        'middleware2-before',
        'execute',
        'middleware2-after',
        'middleware1-after'
      ]);
    });
    
    it('should allow middleware to modify results', async () => {
      const tool = aui
        .tool('transform')
        .execute(async ({ input }) => ({ value: input.value }))
        .middleware(async ({ input, next }) => {
          const result = await next();
          return { ...result, modified: true };
        });
      
      const result = await tool.run({ value: 10 });
      expect(result).toEqual({ value: 10, modified: true });
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
      
      const tools = aui.getTools();
      expect(tools).toHaveLength(3);
      expect(aui.getToolNames()).toEqual(['a', 'b', 'c']);
    });
    
    it('should support tags and filtering', () => {
      aui.tool('weather').tag('api', 'external');
      aui.tool('database').tag('backend', 'internal');
      aui.tool('ui').tag('frontend', 'internal');
      
      expect(aui.findByTag('internal')).toHaveLength(2);
      expect(aui.findByTag('api')).toHaveLength(1);
      expect(aui.findByTags('backend', 'internal')).toHaveLength(1);
    });
  });
  
  describe('Server Executor', () => {
    it('should execute tools on server with security checks', async () => {
      aui.tool('allowed')
        .execute(async () => ({ success: true }));
      
      aui.tool('blocked')
        .execute(async () => ({ success: false }));
      
      const executor = new ServerExecutor({
        allowedTools: ['allowed'],
        blockedTools: ['blocked']
      });
      
      const result = await executor.execute('allowed', {});
      expect(result).toEqual({ success: true });
      
      await expect(executor.execute('blocked', {}))
        .rejects.toThrow('Tool "blocked" is blocked');
    });
    
    it('should handle batch executions', async () => {
      aui.tool('add')
        .input(z.object({ a: z.number(), b: z.number() }))
        .execute(async ({ input }) => input.a + input.b);
      
      aui.tool('multiply')
        .input(z.object({ a: z.number(), b: z.number() }))
        .execute(async ({ input }) => input.a * input.b);
      
      const executor = new ServerExecutor();
      const results = await executor.executeBatch([
        { tool: 'add', input: { a: 2, b: 3 } },
        { tool: 'multiply', input: { a: 4, b: 5 } },
        { tool: 'nonexistent', input: {} }
      ]);
      
      expect(results[0]).toEqual({ tool: 'add', result: 5 });
      expect(results[1]).toEqual({ tool: 'multiply', result: 20 });
      expect(results[2].tool).toBe('nonexistent');
      expect(results[2].error).toBeDefined();
    });
    
    it('should validate input without execution', async () => {
      aui.tool('validated')
        .input(z.object({ 
          name: z.string().min(3),
          age: z.number().positive()
        }))
        .execute(async ({ input }) => input);
      
      const executor = new ServerExecutor();
      
      expect(await executor.validate('validated', { name: 'John', age: 25 }))
        .toBe(true);
      
      expect(await executor.validate('validated', { name: 'Jo', age: 25 }))
        .toBe(false);
      
      expect(await executor.validate('validated', { name: 'John', age: -5 }))
        .toBe(false);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const tool = aui
        .tool('strict')
        .input(z.object({ required: z.string() }))
        .execute(async ({ input }) => input);
      
      await expect(tool.run({ wrong: 'field' } as any))
        .rejects.toThrow();
    });
    
    it('should handle execution errors', async () => {
      const tool = aui
        .tool('error')
        .execute(async () => {
          throw new Error('Execution failed');
        });
      
      await expect(tool.run({}))
        .rejects.toThrow('Execution failed');
    });
    
    it('should handle missing execute handler', async () => {
      const tool = aui.tool('incomplete');
      
      await expect(tool.run({}))
        .rejects.toThrow('Tool incomplete has no execute handler');
    });
  });
  
  describe('Tool Metadata', () => {
    it('should export tool metadata as JSON', () => {
      const tool = aui
        .tool('metadata')
        .describe('A test tool')
        .tag('test', 'example')
        .input(z.object({ test: z.string() }))
        .execute(async ({ input }) => input)
        .clientExecute(async ({ input }) => input)
        .middleware(async ({ next }) => next());
      
      const json = tool.toJSON();
      
      expect(json).toEqual({
        name: 'metadata',
        description: 'A test tool',
        tags: ['test', 'example'],
        hasInput: true,
        hasExecute: true,
        hasClientExecute: true,
        hasRender: false,
        hasMiddleware: true
      });
    });
  });
});