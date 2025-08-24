'use client';

import React, { useState } from 'react';
import aui, { z } from '@/lib/aui';

// Simple tool - just 2 methods
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div className="p-4 bg-blue-50 rounded">{data.city}: {data.temp}°F</div>)
  .build();

// Complex tool - adds client optimization
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side: database search
    const results = [
      { id: 1, title: `Result for "${input.query}"`, score: 0.95 },
      { id: 2, title: `Another match for "${input.query}"`, score: 0.87 },
      { id: 3, title: `Related to "${input.query}"`, score: 0.72 }
    ];
    return results;
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: check cache first, then fetch
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const results = await ctx.fetch('/api/aui/search', { 
      method: 'POST',
      body: JSON.stringify(input) 
    });
    ctx.cache.set(input.query, results);
    return results;
  })
  .render(({ data }) => (
    <div className="space-y-2">
      {data.map((result: any) => (
        <div key={result.id} className="p-3 bg-gray-50 rounded">
          <div className="font-semibold">{result.title}</div>
          <div className="text-sm text-gray-600">Score: {result.score}</div>
        </div>
      ))}
    </div>
  ))
  .build();

// Stock price tool
const stockTool = aui
  .tool('stock')
  .input(z.object({ ticker: z.string() }))
  .execute(async ({ input }) => ({
    ticker: input.ticker,
    price: Math.random() * 500 + 50,
    change: Math.random() * 20 - 10
  }))
  .render(({ data }) => (
    <div className="p-4 bg-white border rounded shadow-sm">
      <div className="flex justify-between items-center">
        <span className="font-bold text-lg">{data.ticker}</span>
        <span className="text-2xl">${data.price.toFixed(2)}</span>
      </div>
      <div className={`text-sm ${data.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
        {data.change > 0 ? '+' : ''}{data.change.toFixed(2)}%
      </div>
    </div>
  ))
  .build();

// Database tool (server-only)
const dbTool = aui
  .tool('database')
  .input(z.object({ 
    table: z.string(),
    operation: z.enum(['create', 'read', 'update', 'delete']),
    data: z.record(z.any()).optional()
  }))
  .execute(async ({ input }) => {
    // Simulated database operation
    const operations = {
      create: () => ({ id: Date.now(), ...input.data }),
      read: () => ({ id: 1, name: 'Sample Record', table: input.table }),
      update: () => ({ id: 1, ...input.data, updated: true }),
      delete: () => ({ deleted: true, table: input.table })
    };
    
    return operations[input.operation]();
  })
  .render(({ data }) => (
    <div className="p-4 bg-green-50 rounded font-mono text-sm">
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  ))
  .build();

// Register tools
aui.register(weatherTool);
aui.register(searchTool);
aui.register(stockTool);
aui.register(dbTool);

export default function AUIDemoPage() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const context = {
    cache: new Map(),
    fetch: async (url: string, options?: any) => {
      const response = await fetch(url, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers }
      });
      return response.json();
    }
  };

  const executeTool = async (toolName: string, input: any) => {
    setLoading(prev => ({ ...prev, [toolName]: true }));
    
    const tool = aui.getTool(toolName);
    if (!tool) return;

    try {
      const result = tool.clientExecute 
        ? await tool.clientExecute({ input, ctx: context })
        : await tool.execute({ input, ctx: context });
      
      setResults(prev => ({ ...prev, [toolName]: result }));
    } catch (error) {
      console.error(`Error executing ${toolName}:`, error);
    } finally {
      setLoading(prev => ({ ...prev, [toolName]: false }));
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">AUI Demo - Concise API for AI Control</h1>
      
      <div className="space-y-8">
        {/* Weather Tool */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Weather Tool</h2>
          <p className="text-gray-600 mb-4">Simple tool with just execute and render methods</p>
          
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => executeTool('weather', { city: 'San Francisco' })}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={loading.weather}
            >
              Get SF Weather
            </button>
            <button
              onClick={() => executeTool('weather', { city: 'New York' })}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={loading.weather}
            >
              Get NYC Weather
            </button>
          </div>
          
          {results.weather && weatherTool.render({ data: results.weather })}
        </section>

        {/* Search Tool */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Search Tool</h2>
          <p className="text-gray-600 mb-4">Complex tool with client-side caching</p>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              id="searchQuery"
              placeholder="Enter search query..."
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={() => {
                const input = (document.getElementById('searchQuery') as HTMLInputElement).value;
                if (input) executeTool('search', { query: input });
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={loading.search}
            >
              Search
            </button>
          </div>
          
          {results.search && searchTool.render({ data: results.search })}
        </section>

        {/* Stock Tool */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Stock Price Tool</h2>
          <p className="text-gray-600 mb-4">Real-time stock price simulation</p>
          
          <div className="flex gap-2 mb-4">
            {['AAPL', 'GOOGL', 'MSFT', 'AMZN'].map(ticker => (
              <button
                key={ticker}
                onClick={() => executeTool('stock', { ticker })}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                disabled={loading.stock}
              >
                {ticker}
              </button>
            ))}
          </div>
          
          {results.stock && stockTool.render({ data: results.stock })}
        </section>

        {/* Database Tool */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Database Tool</h2>
          <p className="text-gray-600 mb-4">Server-only database operations</p>
          
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              onClick={() => executeTool('database', { 
                table: 'users', 
                operation: 'create',
                data: { name: 'John Doe', email: 'john@example.com' }
              })}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={loading.database}
            >
              Create User
            </button>
            <button
              onClick={() => executeTool('database', { 
                table: 'users', 
                operation: 'read'
              })}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={loading.database}
            >
              Read User
            </button>
            <button
              onClick={() => executeTool('database', { 
                table: 'users', 
                operation: 'update',
                data: { name: 'Jane Doe' }
              })}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              disabled={loading.database}
            >
              Update User
            </button>
            <button
              onClick={() => executeTool('database', { 
                table: 'users', 
                operation: 'delete'
              })}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              disabled={loading.database}
            >
              Delete User
            </button>
          </div>
          
          {results.database && dbTool.render({ data: results.database })}
        </section>
      </div>

      {/* Code Example */}
      <section className="mt-12 border rounded-lg p-6 bg-gray-50">
        <h2 className="text-2xl font-semibold mb-4">API Usage Example</h2>
        <pre className="overflow-x-auto text-sm">
          <code>{`// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)
  .build();`}</code>
        </pre>
      </section>
    </div>
  );
}