import aui from '@/lib/aui/lantos-concise';
import { z } from 'zod';

describe('Lantos AUI - Full Integration Test', () => {
  beforeEach(() => {
    // Clear registry between tests
    aui.registry.clear();
  });

  it('should handle complete workflow from tool creation to batch execution', async () => {
    // Create and register multiple tools
    const weatherTool = aui.register(
      aui
        .tool('weather')
        .description('Get weather information')
        .input(z.object({ city: z.string() }))
        .execute(async ({ input }) => ({
          temp: 72,
          city: input.city,
          conditions: 'sunny'
        }))
        .cache(30000)
    );

    const searchTool = aui.register(
      aui
        .tool('search')
        .description('Search with caching')
        .input(z.object({ query: z.string() }))
        .execute(async ({ input }) => ({
          results: [`Result for ${input.query}`],
          count: 1
        }))
        .cache(60000)
        .retry(2)
    );

    const calcTool = aui.register(
      aui
        .tool('calculator')
        .input(z.object({ 
          a: z.number(), 
          b: z.number(), 
          op: z.enum(['+', '-', '*', '/']) 
        }))
        .execute(async ({ input }) => {
          const ops = {
            '+': (a: number, b: number) => a + b,
            '-': (a: number, b: number) => a - b,
            '*': (a: number, b: number) => a * b,
            '/': (a: number, b: number) => a / b
          };
          return { result: ops[input.op](input.a, input.b) };
        })
    );

    // Test tool discovery
    const tools = aui.list();
    expect(tools).toHaveLength(3);
    expect(tools.map(t => t.name)).toEqual(['weather', 'search', 'calculator']);

    // Test individual execution
    const weatherResult = await weatherTool.run({ city: 'Tokyo' });
    expect(weatherResult).toEqual({
      temp: 72,
      city: 'Tokyo',
      conditions: 'sunny'
    });

    // Test execution by name
    const searchResult = await aui.execute('search', { query: 'test' });
    expect(searchResult).toEqual({
      results: ['Result for test'],
      count: 1
    });

    // Test batch execution
    const batchResults = await aui.batch([
      { tool: 'weather', input: { city: 'Paris' } },
      { tool: 'calculator', input: { a: 10, b: 5, op: '*' } },
      { tool: 'search', input: { query: 'batch test' } }
    ]);

    expect(batchResults).toHaveLength(3);
    expect(batchResults[0]).toEqual({
      temp: 72,
      city: 'Paris',
      conditions: 'sunny'
    });
    expect(batchResults[1]).toEqual({ result: 50 });
    expect(batchResults[2]).toEqual({
      results: ['Result for batch test'],
      count: 1
    });

    // Test caching
    const firstCall = await weatherTool.run({ city: 'London' });
    const secondCall = await weatherTool.run({ city: 'London' });
    expect(firstCall).toEqual(secondCall);

    // Test schema export for AI
    const weatherSchema = weatherTool.schema;
    expect(weatherSchema.name).toBe('weather');
    expect(weatherSchema.description).toBe('Get weather information');
    expect(weatherSchema.features.hasCaching).toBe(true);
    expect(weatherSchema.features.hasRetry).toBe(false);
  });

  it('should handle complex tool with all features', async () => {
    let attemptCount = 0;
    const complexTool = aui
      .tool('complex')
      .description('Complex tool with all features')
      .input(z.object({ 
        action: z.enum(['success', 'fail', 'slow']),
        value: z.string()
      }))
      .execute(async ({ input }) => {
        attemptCount++;
        
        if (input.action === 'fail' && attemptCount < 2) {
          throw new Error('Simulated failure');
        }
        
        if (input.action === 'slow') {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return { 
          result: `Processed ${input.value}`,
          attempts: attemptCount
        };
      })
      .clientExecute(async ({ input, ctx }) => {
        const cached = ctx.cache.get(input.value);
        if (cached) return cached;
        
        const result = { result: `Client processed ${input.value}` };
        ctx.cache.set(input.value, result);
        return result;
      })
      .cache(1000)
      .retry(2)
      .timeout(50);

    // Register the tool
    aui.register(complexTool);

    // Test successful execution
    const successResult = await complexTool.run({ action: 'success', value: 'test' });
    expect(successResult.result).toBe('Processed test');

    // Test retry on failure
    attemptCount = 0;
    const retryResult = await complexTool.run({ action: 'fail', value: 'retry' });
    expect(retryResult.result).toBe('Processed retry');
    expect(attemptCount).toBe(2); // Should retry until success (changed from 3 to 2)

    // Test timeout
    attemptCount = 0;
    const timeoutPromise = complexTool.run({ action: 'slow', value: 'timeout' });
    await expect(timeoutPromise).rejects.toThrow('Timeout');

    // Test client execution (in browser environment)
    const originalWindow = global.window;
    global.window = {} as any;
    
    const clientResult = await complexTool.run({ action: 'success', value: 'client' });
    expect(clientResult.result).toBe('Client processed client');
    
    // Test client caching
    const cachedResult = await complexTool.run({ action: 'success', value: 'client' });
    expect(cachedResult).toEqual(clientResult);
    
    global.window = originalWindow;
  });

  it('should handle context properly', async () => {
    const contextTool = aui
      .tool('context-test')
      .input(z.object({ message: z.string() }))
      .execute(async ({ input, ctx }) => ({
        message: input.message,
        user: ctx?.user,
        aiAgent: ctx?.aiAgent
      }));

    aui.register(contextTool);

    // Test with custom context
    const customContext = aui.context({
      user: { id: 123, name: 'Test User' },
      aiAgent: 'custom-agent'
    });

    const result = await contextTool.run(
      { message: 'Hello' },
      customContext
    );

    expect(result).toEqual({
      message: 'Hello',
      user: { id: 123, name: 'Test User' },
      aiAgent: 'custom-agent'
    });

    // Test batch with context
    const batchResults = await aui.batch(
      [{ tool: 'context-test', input: { message: 'Batch' } }],
      customContext
    );

    expect(batchResults[0]).toEqual({
      message: 'Batch',
      user: { id: 123, name: 'Test User' },
      aiAgent: 'custom-agent'
    });
  });

  it('should validate input schemas', async () => {
    const strictTool = aui
      .tool('strict')
      .input(z.object({
        required: z.string(),
        optional: z.number().optional(),
        nested: z.object({
          field: z.boolean()
        })
      }))
      .execute(async ({ input }) => input);

    aui.register(strictTool);

    // Valid input
    const validResult = await strictTool.run({
      required: 'test',
      nested: { field: true }
    });
    expect(validResult.required).toBe('test');

    // Invalid input
    await expect(
      strictTool.run({
        required: 123, // Wrong type
        nested: { field: true }
      } as any)
    ).rejects.toThrow();

    // Missing required field
    await expect(
      strictTool.run({
        nested: { field: true }
      } as any)
    ).rejects.toThrow();
  });

  it('should handle render functions', () => {
    const renderTool = aui
      .tool('render-test')
      .execute(async () => ({ value: 42 }))
      .render(({ data, loading, error }) => {
        if (loading) return { type: 'loading' } as any;
        if (error) return { type: 'error', message: error.message } as any;
        return { type: 'success', value: data.value } as any;
      });

    const renderFn = renderTool.definition.render;
    expect(renderFn).toBeDefined();

    // Test render states
    const loadingRender = renderFn!({ data: null as any, loading: true });
    expect(loadingRender).toEqual({ type: 'loading' });

    const errorRender = renderFn!({ 
      data: null as any, 
      error: new Error('Test error') 
    });
    expect(errorRender).toEqual({ type: 'error', message: 'Test error' });

    const successRender = renderFn!({ data: { value: 42 } });
    expect(successRender).toEqual({ type: 'success', value: 42 });
  });
});