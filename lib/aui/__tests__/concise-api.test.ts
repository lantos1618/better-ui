import { describe, it, expect, beforeEach } from '@jest/globals';
import aui from '../index';
import { z } from 'zod';

describe('AUI Concise API', () => {
  beforeEach(() => {
    aui.clear();
  });

  it('creates simple tool with 2 methods', async () => {
    const simpleTool = aui
      .tool('weather')
      .input(z.object({ city: z.string() }))
      .execute(async ({ input }) => ({ temp: 72, city: input.city }));

    expect(simpleTool.name).toBe('weather');
    const result = await simpleTool.run({ city: 'NYC' });
    expect(result).toEqual({ temp: 72, city: 'NYC' });
  });

  it('creates complex tool with client optimization', async () => {
    const complexTool = aui
      .tool('search')
      .input(z.object({ query: z.string() }))
      .execute(async ({ input }) => ({ results: [`Result for ${input.query}`] }))
      .clientExecute(async ({ input, ctx }) => {
        const cached = ctx.cache.get(input.query);
        if (cached) return cached;
        
        const result = { results: [`Cached ${input.query}`] };
        ctx.cache.set(input.query, result);
        return result;
      });

    expect(complexTool.name).toBe('search');
    
    // Test server execution
    const serverCtx = { cache: new Map(), fetch, isServer: true };
    const serverResult = await complexTool.run({ query: 'test' }, serverCtx);
    expect(serverResult).toEqual({ results: ['Result for test'] });
    
    // Test client execution with cache
    const clientCtx = { cache: new Map(), fetch, isServer: false };
    const clientResult = await complexTool.run({ query: 'test' }, clientCtx);
    expect(clientResult).toEqual({ results: ['Cached test'] });
    
    // Test cache hit
    clientCtx.cache.set('test', { results: ['From cache'] });
    const cachedResult = await complexTool.run({ query: 'test' }, clientCtx);
    expect(cachedResult).toEqual({ results: ['From cache'] });
  });

  it('supports method chaining', () => {
    const tool = aui
      .tool('chain')
      .describe('A chained tool')
      .tag('test', 'demo')
      .input(z.object({ value: z.number() }))
      .execute(async ({ input }) => input.value * 2)
      .middleware(async ({ input, next }) => {
        const result = await next();
        return result + 1;
      });

    expect(tool.name).toBe('chain');
    expect(tool.description).toBe('A chained tool');
    expect(tool.tags).toEqual(['test', 'demo']);
  });

  it('validates input with zod schema', async () => {
    const tool = aui
      .tool('validated')
      .input(z.object({ 
        required: z.string(),
        optional: z.number().optional()
      }))
      .execute(async ({ input }) => input);

    await expect(tool.run({ required: 'test' }))
      .resolves.toEqual({ required: 'test' });
    
    await expect(tool.run({ required: 123 } as any))
      .rejects.toThrow();
  });

  it('executes middleware in order', async () => {
    const executionOrder: string[] = [];
    
    const tool = aui
      .tool('middleware')
      .input(z.object({ value: z.number() }))
      .execute(async ({ input }) => {
        executionOrder.push('execute');
        return input.value;
      })
      .middleware(async ({ input, next }) => {
        executionOrder.push('middleware1');
        const result = await next();
        return result + 10;
      })
      .middleware(async ({ input, next }) => {
        executionOrder.push('middleware2');
        const result = await next();
        return result + 100;
      });

    const result = await tool.run({ value: 1 });
    expect(result).toBe(111); // 1 + 10 + 100
    expect(executionOrder).toEqual(['middleware1', 'middleware2', 'execute']);
  });

  it('handles async and sync handlers', async () => {
    const syncTool = aui
      .tool('sync')
      .input(z.object({ value: z.number() }))
      .execute(({ input }) => input.value * 2); // Sync

    const asyncTool = aui
      .tool('async')
      .input(z.object({ value: z.number() }))
      .execute(async ({ input }) => input.value * 3); // Async

    expect(await syncTool.run({ value: 5 })).toBe(10);
    expect(await asyncTool.run({ value: 5 })).toBe(15);
  });

  it('provides proper TypeScript types', async () => {
    const typedTool = aui
      .tool('typed')
      .input(z.object({ name: z.string(), age: z.number() }))
      .execute(async ({ input }) => ({
        greeting: `Hello ${input.name}`,
        yearBorn: 2024 - input.age
      }));

    const result = await typedTool.run({ name: 'John', age: 30 });
    expect(result.greeting).toBe('Hello John');
    expect(result.yearBorn).toBe(1994);
  });

  it('tools are registered and retrievable', () => {
    const tool1 = aui.tool('tool1').execute(async () => 'result1');
    const tool2 = aui.tool('tool2').execute(async () => 'result2');

    expect(aui.has('tool1')).toBe(true);
    expect(aui.has('tool2')).toBe(true);
    expect(aui.getToolNames()).toContain('tool1');
    expect(aui.getToolNames()).toContain('tool2');
    
    const retrieved = aui.get('tool1');
    expect(retrieved).toBe(tool1);
  });

  it('supports tool discovery by tags', () => {
    aui.tool('api-tool').tag('api', 'backend').execute(async () => null);
    aui.tool('ui-tool').tag('ui', 'frontend').execute(async () => null);
    aui.tool('full-stack').tag('api', 'ui').execute(async () => null);

    expect(aui.findByTag('api').length).toBe(2);
    expect(aui.findByTag('ui').length).toBe(2);
    expect(aui.findByTags('api', 'ui').length).toBe(1);
  });

  it('handles errors gracefully', async () => {
    const errorTool = aui
      .tool('error')
      .input(z.object({ shouldFail: z.boolean() }))
      .execute(async ({ input }) => {
        if (input.shouldFail) {
          throw new Error('Intentional error');
        }
        return 'success';
      });

    await expect(errorTool.run({ shouldFail: true }))
      .rejects.toThrow('Intentional error');
    
    await expect(errorTool.run({ shouldFail: false }))
      .resolves.toBe('success');
  });
});