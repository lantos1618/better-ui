import aui, { z } from '../index';
import React from 'react';

// Simple weather tool - just 2 methods
export const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex search tool - adds client optimization
export const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side: search database
    const results = await simulateDbSearch(input.query);
    return results;
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: check cache first, then fetch
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const response = await ctx.fetch('/api/aui/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'search', input })
    });
    
    const data = await response.json();
    ctx.cache.set(input.query, data);
    return data;
  })
  .render(({ data }) => <SearchResults results={data} />);

// Helper components
const SearchResults: React.FC<{ results: any[] }> = ({ results }) => (
  <div className="space-y-2">
    {results.map((result, i) => (
      <div key={i} className="p-2 border rounded">
        <h3 className="font-semibold">{result.title}</h3>
        <p className="text-sm text-gray-600">{result.description}</p>
      </div>
    ))}
  </div>
);

// Simulate database search
async function simulateDbSearch(query: string): Promise<any[]> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return [
    { title: `Result 1 for "${query}"`, description: 'First matching result' },
    { title: `Result 2 for "${query}"`, description: 'Second matching result' },
    { title: `Result 3 for "${query}"`, description: 'Third matching result' },
  ];
}

// Additional examples for demonstration
export const calculatorTool = aui
  .tool('calculator')
  .input(z.object({ 
    a: z.number(), 
    b: z.number(), 
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']) 
  }))
  .execute(async ({ input }) => {
    const { a, b, operation } = input;
    const operations = {
      add: a + b,
      subtract: a - b,
      multiply: a * b,
      divide: b !== 0 ? a / b : NaN
    };
    return { result: operations[operation], operation, a, b };
  })
  .render(({ data }) => (
    <div className="p-4 bg-gray-50 rounded">
      <span className="font-mono">
        {data.a} {operationSymbol(data.operation)} {data.b} = {data.result}
      </span>
    </div>
  ));

function operationSymbol(op: string): string {
  const symbols = { add: '+', subtract: '-', multiply: '×', divide: '÷' };
  return symbols[op as keyof typeof symbols] || op;
}

// User profile tool with client-side caching
export const userProfileTool = aui
  .tool('userProfile')
  .input(z.object({ userId: z.string() }))
  .execute(async ({ input }) => {
    // Server-side: fetch from database
    await new Promise(resolve => setTimeout(resolve, 200));
    return {
      id: input.userId,
      name: `User ${input.userId}`,
      email: `user${input.userId}@example.com`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${input.userId}`,
      lastActive: new Date().toISOString()
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    const cacheKey = `user:${input.userId}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.data;
    }
    
    const response = await ctx.fetch('/api/aui/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'userProfile', input })
    });
    
    const data = await response.json();
    ctx.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div>Loading profile...</div>;
    if (error) return <div>Error: {error.message}</div>;
    
    return (
      <div className="flex items-center space-x-4 p-4 border rounded">
        <img src={data.avatar} alt={data.name} className="w-12 h-12 rounded-full" />
        <div>
          <h3 className="font-semibold">{data.name}</h3>
          <p className="text-sm text-gray-600">{data.email}</p>
          <p className="text-xs text-gray-400">Active: {new Date(data.lastActive).toLocaleString()}</p>
        </div>
      </div>
    );
  });