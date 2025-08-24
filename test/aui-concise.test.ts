import aui, { z } from '../lib/aui/index-concise';

// Manual test suite for AUI Concise API
async function runTests() {
  console.log('Testing AUI Concise API...\n');
  
  // Test 1: Simple tool creation
  console.log('Test 1: Simple tool creation');
  try {
    const weatherTool = aui
      .tool('weather')
      .input(z.object({ city: z.string() }))
      .execute(async ({ input }) => ({ temp: 72, city: input.city }))
      .render(({ data }) => `${data.city}: ${data.temp}°` as any)
      .build();
    
    console.log('✓ Weather tool created:', weatherTool.name);
  } catch (error) {
    console.error('✗ Failed:', error);
  }

  // Test 2: Tool with client execution
  console.log('\nTest 2: Tool with client execution');
  try {
    const searchTool = aui
      .tool('search')
      .input(z.object({ query: z.string() }))
      .execute(async ({ input }) => [`Result for ${input.query}`])
      .clientExecute(async ({ input, ctx }) => {
        const cached = ctx.cache.get(input.query);
        return cached || [`Client result for ${input.query}`];
      })
      .render(({ data }) => data.join(', ') as any)
      .build();
    
    console.log('✓ Search tool created with client execution');
  } catch (error) {
    console.error('✗ Failed:', error);
  }

  // Test 3: Tool execution
  console.log('\nTest 3: Tool execution');
  try {
    const calcTool = aui
      .tool('calculator')
      .input(z.object({ a: z.number(), b: z.number() }))
      .execute(async ({ input }) => input.a + input.b)
      .render(({ data }) => `Result: ${data}` as any)
      .build();
    
    const result = await calcTool.execute({
      input: { a: 5, b: 3 },
      ctx: { cache: new Map(), fetch: async () => ({}) }
    });
    
    console.log('✓ Calculator result:', result);
  } catch (error) {
    console.error('✗ Failed:', error);
  }

  // Test 4: Tool registry
  console.log('\nTest 4: Tool registry');
  try {
    const tool1 = aui
      .tool('tool1')
      .input(z.object({ test: z.string() }))
      .execute(async () => 'done')
      .build();
    
    aui.register(tool1);
    const retrieved = aui.get('tool1');
    
    if (retrieved === tool1) {
      console.log('✓ Tool registered and retrieved successfully');
    } else {
      console.log('✗ Tool retrieval failed');
    }
  } catch (error) {
    console.error('✗ Failed:', error);
  }

  // Test 5: Error handling - missing input
  console.log('\nTest 5: Error handling - missing input');
  try {
    aui
      .tool('invalid')
      .execute(async () => 'test')
      .build();
    console.log('✗ Should have thrown error for missing input');
  } catch (error: any) {
    if (error.message.includes('input schema')) {
      console.log('✓ Correctly caught missing input error');
    } else {
      console.error('✗ Wrong error:', error);
    }
  }

  // Test 6: Error handling - missing execute
  console.log('\nTest 6: Error handling - missing execute');
  try {
    aui
      .tool('invalid2')
      .input(z.object({ test: z.string() }))
      .build();
    console.log('✗ Should have thrown error for missing execute');
  } catch (error: any) {
    if (error.message.includes('execute handler')) {
      console.log('✓ Correctly caught missing execute error');
    } else {
      console.error('✗ Wrong error:', error);
    }
  }

  // Test 7: Complex tool with context
  console.log('\nTest 7: Complex tool with context usage');
  try {
    const cache = new Map();
    cache.set('cached-query', ['Cached result']);
    
    const contextTool = aui
      .tool('context-aware')
      .input(z.object({ query: z.string() }))
      .execute(async ({ input }) => [`Server: ${input.query}`])
      .clientExecute(async ({ input, ctx }) => {
        const cached = ctx.cache.get(input.query);
        if (cached) return cached;
        return [`Fresh: ${input.query}`];
      })
      .build();
    
    const cachedResult = await contextTool.clientExecute!({
      input: { query: 'cached-query' },
      ctx: { cache, fetch: async () => ({}) }
    });
    
    const freshResult = await contextTool.clientExecute!({
      input: { query: 'new-query' },
      ctx: { cache, fetch: async () => ({}) }
    });
    
    console.log('✓ Cached result:', cachedResult);
    console.log('✓ Fresh result:', freshResult);
  } catch (error) {
    console.error('✗ Failed:', error);
  }

  console.log('\n✅ All tests completed!');
}

// Run the tests
runTests().catch(console.error);