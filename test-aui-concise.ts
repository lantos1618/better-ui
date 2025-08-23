#!/usr/bin/env node
import aui, { z } from './lib/aui/index.js';

console.log('Testing AUI Concise API...\n');

// Test 1: Simple tool with the concise API
console.log('1. Testing aui.simple():');
const weatherTool = aui.simple(
  'weather',
  z.object({ city: z.string() }),
  async (input) => ({ temp: 72, city: input.city }),
  (data) => `${data.city}: ${data.temp}°`
);
console.log('✓ Weather tool created:', weatherTool.name);

// Test 2: Quick mode
console.log('\n2. Testing quick mode:');
const quickTool = aui
  .quick('greeting')
  .input(z.object({ name: z.string() }))
  .execute((input) => `Hello, ${input.name}!`)
  .render((data) => data);
console.log('✓ Quick tool created:', quickTool);

// Test 3: Using .run()
console.log('\n3. Testing .run() method:');
const calcTool = aui
  .tool('calculator')
  .input(z.object({ a: z.number(), b: z.number() }))
  .run(
    (input) => input.a + input.b,
    (result) => `Result: ${result}`
  )
  .build();
console.log('✓ Calculator tool created:', calcTool.name);

// Test 4: Using .handle()
console.log('\n4. Testing .handle() method:');
const stockTool = aui
  .tool('stock')
  .handle(
    z.object({ ticker: z.string() }),
    async (input) => ({ ticker: input.ticker, price: Math.random() * 1000 })
  )
  .render((data) => `${data.ticker}: $${data.price.toFixed(2)}`)
  .build();
console.log('✓ Stock tool created:', stockTool.name);

// Test 5: Server-only tool
console.log('\n5. Testing aui.server():');
const dbTool = aui.server(
  'db-write',
  z.object({ table: z.string(), data: z.record(z.any()) }),
  async (input) => ({ id: Date.now(), ...input.data }),
  (data) => `Created record #${data.id}`
);
console.log('✓ DB tool created (server-only):', dbTool.name, '- isServerOnly:', dbTool.isServerOnly);

// Test 6: Context-aware tool
console.log('\n6. Testing aui.contextual():');
const userTool = aui.contextual(
  'user-info',
  z.object({ userId: z.string().optional() }),
  async ({ input, ctx }) => {
    const id = input.userId || ctx.userId || 'anonymous';
    return { id, name: `User ${id}` };
  },
  (user) => `${user.name} (ID: ${user.id})`
);
console.log('✓ User tool created:', userTool.name);

// Test execution
console.log('\n7. Testing tool execution:');
const testContext = {
  cache: new Map(),
  fetch: async (url: string) => ({ data: 'mock' }),
  userId: 'test123'
};

async function runTests() {
  // Test weather tool
  const weatherResult = await weatherTool.execute({
    input: { city: 'San Francisco' },
    ctx: testContext
  });
  console.log('✓ Weather tool result:', weatherResult);
  
  // Test calc tool
  const calcResult = await calcTool.execute({
    input: { a: 5, b: 3 },
    ctx: testContext
  });
  console.log('✓ Calculator result:', calcResult);
  
  // Test user tool
  const userResult = await userTool.execute({
    input: {},
    ctx: testContext
  });
  console.log('✓ User tool result:', userResult);
  
  console.log('\n✅ All tests passed!');
}

runTests().catch(console.error);