import aui from '@/lib/aui';
import { z } from 'zod';
import React from 'react';
import type { ToolContext } from '@/lib/aui';

// ============================================
// 1. SIMPLE TOOL - Just 2 methods (as requested)
// ============================================
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// ============================================
// 2. COMPLEX TOOL - With client optimization
// ============================================
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side database search
    const results = await fetch(`/api/search?q=${input.query}`);
    return results.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side with caching
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify(input) 
    });
    ctx.cache.set(input.query, result, { ttl: 60000 }); // 1 min cache
    return result;
  })
  .render(({ data }) => (
    <div className="search-results">
      {data.map((item: any) => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  ))
  .build();

// ============================================
// 3. ULTRA-CONCISE API VARIATIONS
// ============================================

// One-liner simple tool
const greetingTool = aui.simple(
  'greeting',
  z.object({ name: z.string() }),
  async ({ name }) => `Hello, ${name}!`,
  (data) => <h1>{data}</h1>
);

// Quick mode - auto-builds after render
const calcTool = aui
  .quick('calculator')
  .input(z.object({ a: z.number(), b: z.number(), op: z.enum(['+', '-', '*', '/']) }))
  .execute(({ input }) => {
    switch (input.op) {
      case '+': return input.a + input.b;
      case '-': return input.a - input.b;
      case '*': return input.a * input.b;
      case '/': return input.a / input.b;
    }
  })
  .render(({ data }) => <span>{data}</span>);
// No .build() needed in quick mode!

// Server-only tool (no client execution)
const databaseTool = aui.server(
  'database-query',
  z.object({ sql: z.string() }),
  async ({ sql }) => {
    // This only runs on server - never exposed to client
    const db = await import('@/lib/db');
    return db.query(sql);
  },
  (data) => <pre>{JSON.stringify(data, null, 2)}</pre>
);

// Context-aware tool with access to session, cache, etc
const userProfileTool = aui.contextual(
  'user-profile',
  z.object({ userId: z.string() }),
  async ({ input, ctx }) => {
    const session = ctx.session;
    const cached = ctx.cache.get(`user:${input.userId}`);
    if (cached) return cached;
    
    const profile = await fetch(`/api/users/${input.userId}`);
    const data = await profile.json();
    ctx.cache.set(`user:${input.userId}`, data);
    return data;
  },
  (data) => (
    <div className="profile">
      <img src={data.avatar} alt={data.name} />
      <h2>{data.name}</h2>
    </div>
  )
);

// ============================================
// 4. ADVANCED PATTERNS
// ============================================

// Streaming tool with real-time updates
const streamingTool = aui
  .tool('live-data')
  .input(z.object({ channel: z.string() }))
  .execute(async function* ({ input }) {
    // Generator function for streaming
    const ws = new WebSocket(`ws://api/stream/${input.channel}`);
    while (true) {
      const data = await new Promise(resolve => {
        ws.onmessage = (e) => resolve(JSON.parse(e.data));
      });
      yield data;
    }
  })
  .render(({ data }) => <div className="live">{data.value}</div>)
  .build();

// Tool with validation and error handling
const validatedTool = aui
  .tool('form-submit')
  .input(z.object({
    email: z.string().email(),
    age: z.number().min(18).max(120),
    terms: z.boolean().refine(v => v === true, 'Must accept terms')
  }))
  .execute(async ({ input }) => {
    // Input is already validated by Zod
    return { success: true, userId: crypto.randomUUID() };
  })
  .render(({ data }) => (
    <div className="success">
      Welcome! Your ID is {data.userId}
    </div>
  ))
  .build();

// Batch tool execution
const batchTool = aui
  .tool('batch-process')
  .input(z.object({ items: z.array(z.string()) }))
  .execute(async ({ input }) => {
    // Process multiple items in parallel
    const results = await Promise.all(
      input.items.map(item => processItem(item))
    );
    return results;
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side batch with progress tracking
    const results = [];
    for (let i = 0; i < input.items.length; i++) {
      ctx.onProgress?.(i / input.items.length);
      results.push(await ctx.fetch(`/api/process/${input.items[i]}`));
    }
    return results;
  })
  .render(({ data }) => (
    <ul>
      {data.map((result: any, i: number) => (
        <li key={i}>{result.status}</li>
      ))}
    </ul>
  ))
  .build();

// ============================================
// 5. REACT COMPONENT USAGE
// ============================================
export function ToolDemo() {
  const { execute, data, loading, error } = useTool(weatherTool);
  
  return (
    <div>
      <button onClick={() => execute({ city: 'San Francisco' })}>
        Get Weather
      </button>
      {loading && <span>Loading...</span>}
      {error && <span>Error: {error.message}</span>}
      {data && <weatherTool.render data={data} />}
    </div>
  );
}

// Batch execution example
export function BatchDemo() {
  const { execute, results } = useToolBatch([
    { tool: weatherTool, input: { city: 'NYC' } },
    { tool: searchTool, input: { query: 'AI tools' } },
    { tool: greetingTool, input: { name: 'Claude' } }
  ]);
  
  return (
    <div>
      <button onClick={execute}>Run All Tools</button>
      {results.map((result, i) => (
        <div key={i}>
          {result.loading && 'Loading...'}
          {result.data && <pre>{JSON.stringify(result.data)}</pre>}
        </div>
      ))}
    </div>
  );
}

// ============================================
// 6. AI AGENT INTEGRATION
// ============================================

// Register all tools for AI agent access
[weatherTool, searchTool, greetingTool, calcTool, databaseTool].forEach(tool => {
  aui.register(tool);
});

// AI can now discover and use tools
export async function aiHandler(query: string) {
  const tools = aui.getTools();
  // AI selects appropriate tool based on query
  const selectedTool = tools.find(t => t.name.includes(query.toLowerCase()));
  
  if (selectedTool) {
    // AI would generate appropriate input based on the tool's schema
    const input = {}; // Placeholder - AI would generate this
    const result = await selectedTool.execute({ input });
    return selectedTool.render({ data: result, input });
  }
}

// Helper function for the batch example
async function processItem(item: string) {
  return { status: 'processed', item };
}

// Import hooks from AUI
import { useTool, useToolBatch } from '@/lib/aui/client/hooks';