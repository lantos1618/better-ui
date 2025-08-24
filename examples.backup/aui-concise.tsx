import React from 'react';
import { z } from 'zod';
import aui from '@/lib/aui';

// ======================================
// Simple tool - just 2 methods (no input schema needed)
// ======================================
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }: { input: { city: string } }) => ({ temp: 72, city: input.city }))
  .render(({ data }: { data: { temp: number; city: string } }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// ======================================
// Even simpler - sync execution
// ======================================
const syncTool = aui
  .tool('greeting')
  .input(z.object({ name: z.string() }))
  .execute(({ input }: { input: { name: string } }) => `Hello, ${input.name}!`)
  .render(({ data }: { data: string }) => <h1>{data}</h1>)
  .done(); // alias for build()

// ======================================
// Complex tool - adds client optimization
// ======================================
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }: { input: { query: string } }) => {
    // Server-side: database search
    return await db.search(input.query);
  })
  .clientExecute(async ({ input, ctx }: { input: { query: string }; ctx: any }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }: { data: any }) => <SearchResults results={data} />)
  .build();

// ======================================
// Server-only tool (no client execution)
// ======================================
const serverOnlyTool = aui
  .tool('database-write')
  .input(z.object({ 
    table: z.string(),
    data: z.record(z.any())
  }))
  .serverOnly()
  .execute(async ({ input }: { input: { table: string; data: Record<string, any> } }) => {
    // This will only run on server
    return await db.insert(input.table, input.data);
  })
  .render(({ data }: { data: { id: number } }) => <div>Inserted: {data.id}</div>)
  .build();

// ======================================
// Tool with description (for AI agents)
// ======================================
const aiTool = aui
  .tool('stock-price')
  .description('Get real-time stock price for a given ticker symbol')
  .input(z.object({ ticker: z.string() }))
  .execute(async ({ input }: { input: { ticker: string } }) => {
    const price = await fetchStockPrice(input.ticker);
    return { ticker: input.ticker, price };
  })
  .render(({ data }: { data: { ticker: string; price: number } }) => (
    <div className="stock-card">
      <span>{data.ticker}</span>
      <span className="price">${data.price}</span>
    </div>
  ))
  .build();

// ======================================
// Tool using context
// ======================================
const contextAwareTool = aui
  .tool('user-profile')
  .input(z.object({ userId: z.string().optional() }))
  .execute(async ({ input, ctx }: { input: { userId?: string }; ctx?: any }) => {
    const id = input.userId || ctx?.userId || 'anonymous';
    return await fetchUserProfile(id);
  })
  .render(({ data }: { data: any }) => <UserProfile user={data} />)
  .build();

// ======================================
// Register all tools
// ======================================
[simpleTool, syncTool, complexTool, serverOnlyTool, aiTool, contextAwareTool]
  .forEach(tool => aui.register(tool));

// ======================================
// Usage in React component
// ======================================
export function ToolDemo() {
  const [result, setResult] = React.useState<any>(null);
  
  const runTool = async () => {
    // Mock executor for demo
    const executor = {
      execute: async (call: any) => ({ 
        output: { temp: 72, city: call.input.city } 
      })
    };
    const result = await executor.execute({
      id: '1',
      toolName: 'weather',
      input: { city: 'San Francisco' }
    });
    setResult(result);
  };

  return (
    <div>
      <button onClick={runTool}>Run Weather Tool</button>
      {result && simpleTool.render?.({ 
        data: result.output, 
        input: { city: 'San Francisco' }
      })}
    </div>
  );
}

// Mock implementations
const db = {
  search: async (query: string) => [{ id: 1, title: `Result for ${query}` }],
  insert: async (table: string, data: any) => ({ id: Date.now(), ...data })
};

const fetchStockPrice = async (ticker: string) => Math.random() * 1000;
const fetchUserProfile = async (id: string) => ({ id, name: 'User ' + id });

const SearchResults = ({ results }: any) => (
  <div>{results.map((r: any) => <div key={r.id}>{r.title}</div>)}</div>
);

const UserProfile = ({ user }: any) => <div>{user.name}</div>;