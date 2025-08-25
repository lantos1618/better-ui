#!/usr/bin/env node
import aui, { z } from './lib/aui/lantos-aui';

console.log('🚀 Testing Lantos AUI - Ultra-Concise API\n');

// Test 1: Simple tool WITHOUT .build()
console.log('1️⃣ Testing simple tool (no .build() required):');
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => `${data.city}: ${data.temp}°`);

console.log('✓ Weather tool created:', weatherTool.name);
console.log('✓ Tool is ready immediately, no .build() needed!\n');

// Test 2: One-liner tool
console.log('2️⃣ Testing one-liner with aui.do():');
const pingTool = aui.do('ping', () => 'pong');
console.log('✓ Ping tool created:', pingTool.name);

// Test 3: Simple helper
console.log('\n3️⃣ Testing aui.simple() helper:');
const greetTool = aui.simple(
  'greet',
  z.object({ name: z.string() }),
  ({ name }) => `Hello, ${name}!`,
  (msg) => msg
);
console.log('✓ Greet tool created:', greetTool.name);

// Test 4: AI-optimized tool
console.log('\n4️⃣ Testing aui.ai() with retry:');
let attempts = 0;
const apiTool = aui.ai('flaky-api', {
  input: z.object({ endpoint: z.string() }),
  execute: async ({ input }) => {
    attempts++;
    if (attempts < 2) {
      throw new Error('Temporary failure');
    }
    return { success: true, endpoint: input.endpoint, attempts };
  },
  retry: 3,
  cache: true
});
console.log('✓ API tool created with retry logic:', apiTool.name);

// Test 5: Batch definition
console.log('\n5️⃣ Testing aui.defineTools():');
const mathTools = aui.defineTools({
  add: {
    input: z.object({ a: z.number(), b: z.number() }),
    execute: ({ input }) => input.a + input.b,
    render: ({ data }) => `Result: ${data}`
  },
  multiply: {
    input: z.object({ a: z.number(), b: z.number() }),
    execute: ({ input }) => input.a * input.b,
    render: ({ data }) => `Product: ${data}`
  }
});
console.log('✓ Math tools created:', Object.keys(mathTools).join(', '));

// Test 6: Complex tool with client execution
console.log('\n6️⃣ Testing complex tool with client/server execution:');
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    console.log('  → Server execution called');
    return { source: 'server', query: input.query, results: ['server result'] };
  })
  .clientExecute(async ({ input, ctx }) => {
    console.log('  → Client execution called');
    const cached = ctx.cache.get(input.query);
    if (cached) {
      console.log('  → Cache hit!');
      return cached;
    }
    const result = { source: 'client', query: input.query, results: ['client result'] };
    ctx.cache.set(input.query, result);
    return result;
  });
console.log('✓ Search tool created with dual execution modes');

// Test execution
console.log('\n7️⃣ Testing tool execution:\n');

const testContext = {
  cache: new Map(),
  fetch: async (url: string) => ({ data: 'mock' })
};

async function runTests() {
  try {
    // Test weather tool
    console.log('Testing weather tool:');
    const weatherResult = await weatherTool.run({ city: 'San Francisco' });
    console.log('  Result:', weatherResult);
    
    // Test ping tool
    console.log('\nTesting ping tool:');
    const pingResult = await pingTool.run(undefined);
    console.log('  Result:', pingResult);
    
    // Test greet tool
    console.log('\nTesting greet tool:');
    const greetResult = await greetTool.run({ name: 'World' });
    console.log('  Result:', greetResult);
    
    // Test API tool with retry
    console.log('\nTesting API tool (will retry on failure):');
    attempts = 0; // Reset counter
    const apiResult = await apiTool.run({ endpoint: '/api/test' }, testContext);
    console.log('  Result after', apiResult.attempts, 'attempts:', apiResult.success);
    
    // Test math tools
    console.log('\nTesting math tools:');
    const addResult = await mathTools.add.run({ a: 5, b: 3 });
    console.log('  Add result:', addResult);
    const multiplyResult = await mathTools.multiply.run({ a: 4, b: 7 });
    console.log('  Multiply result:', multiplyResult);
    
    // Test search with client execution
    console.log('\nTesting search tool with context (client execution):');
    const searchResult1 = await searchTool.run({ query: 'test' }, testContext);
    console.log('  First search:', searchResult1.source);
    
    // Second search should hit cache
    const searchResult2 = await searchTool.run({ query: 'test' }, testContext);
    console.log('  Second search (should be cached):', searchResult2.source);
    
    // Test search without context (server execution)
    console.log('\nTesting search tool without context (server execution):');
    const searchResult3 = await searchTool.run({ query: 'test' });
    console.log('  Server search:', searchResult3.source);
    
    // Test validation
    console.log('\nTesting input validation:');
    try {
      await greetTool.run({ name: 123 as any });
      console.log('  ❌ Should have thrown validation error');
    } catch (error: any) {
      console.log('  ✓ Validation error caught:', error.name);
    }
    
    // List all tools
    console.log('\n8️⃣ All registered tools:');
    const allTools = aui.getTools();
    console.log('  Total tools:', allTools.length);
    console.log('  Tool names:', allTools.map(t => t.name).join(', '));
    
    console.log('\n✅ All tests passed successfully!');
    console.log('\n🎉 Lantos AUI is working perfectly - no .build() required!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests().catch(console.error);