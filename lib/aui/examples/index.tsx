// AUI Tool Examples
import aui, { z } from '../index';
import React from 'react';

// Simple weather tool - just 2 methods
export const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: Math.floor(Math.random() * 30) + 60, 
    city: input.city,
    condition: 'Sunny',
    humidity: 65
  }))
  .render(({ data }) => {
    if (!data) return null;
    return (
      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold">{data.city}</h3>
        <p className="text-2xl font-bold">{data.temp}°F</p>
        <p className="text-sm text-gray-600">{data.condition} • {data.humidity}% humidity</p>
      </div>
    );
  });

// Complex search tool - adds client optimization
export const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulate database search
    await new Promise(r => setTimeout(r, 500));
    return {
      results: [
        { id: 1, title: `Result for "${input.query}"`, score: 0.95, description: 'First matching result with high relevance' },
        { id: 2, title: `Another result`, score: 0.87, description: 'Secondary result with good relevance' },
        { id: 3, title: `Related content`, score: 0.72, description: 'Additional related information' }
      ],
      total: 3,
      query: input.query
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side optimization with caching
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for query: ${input.query}`);
      return cached;
    }
    
    const result = await ctx.fetch('/api/aui/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'search', input })
    }).then(r => r.json());
    
    ctx.cache.set(cacheKey, result);
    return result;
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div className="animate-pulse">Searching...</div>;
    if (error) return <div className="text-red-500">Error: {error.message}</div>;
    if (!data) return null;
    
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">Found {data.total} results for &quot;{data.query}&quot;</p>
        {data.results.map((result: any) => (
          <div key={result.id} className="p-3 bg-white border rounded-lg hover:shadow-md transition-shadow">
            <h4 className="font-semibold">{result.title}</h4>
            <p className="text-sm text-gray-600">{result.description}</p>
            <span className="text-xs text-blue-600">Score: {result.score}</span>
          </div>
        ))}
      </div>
    );
  });

// Calculator tool with render
export const calculatorTool = aui
  .tool('calculator')
  .input(z.object({ 
    a: z.number(), 
    b: z.number(), 
    op: z.enum(['+', '-', '*', '/']) 
  }))
  .execute(({ input }) => {
    const ops = {
      '+': (a: number, b: number) => a + b,
      '-': (a: number, b: number) => a - b,
      '*': (a: number, b: number) => a * b,
      '/': (a: number, b: number) => a / b
    };
    return { 
      result: ops[input.op](input.a, input.b),
      expression: `${input.a} ${input.op} ${input.b}`
    };
  })
  .render(({ data }) => {
    if (!data) return null;
    return (
      <div className="p-3 bg-gray-50 rounded-lg font-mono">
        <span className="text-gray-600">{data.expression} =</span>
        <span className="ml-2 text-xl font-bold">{data.result}</span>
      </div>
    );
  });

// Data fetcher tool with both server and client execution
export const dataFetcherTool = aui
  .tool('dataFetcher')
  .input(z.object({ 
    endpoint: z.string(),
    method: z.enum(['GET', 'POST']).default('GET'),
    body: z.any().optional()
  }))
  .execute(async ({ input }) => {
    // Server-side execution
    const response = await fetch(input.endpoint, {
      method: input.method,
      headers: { 'Content-Type': 'application/json' },
      body: input.body ? JSON.stringify(input.body) : undefined
    });
    return await response.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side with request deduplication
    const requestKey = `${input.method}:${input.endpoint}:${JSON.stringify(input.body)}`;
    
    // Check if request is already in flight
    const inflight = ctx.cache.get(`inflight:${requestKey}`);
    if (inflight) return inflight;
    
    // Check cache
    const cached = ctx.cache.get(requestKey);
    if (cached && input.method === 'GET') return cached;
    
    // Make request
    const promise = ctx.fetch(input.endpoint, {
      method: input.method,
      headers: { 'Content-Type': 'application/json' },
      body: input.body ? JSON.stringify(input.body) : undefined
    }).then(r => r.json());
    
    // Store inflight request
    ctx.cache.set(`inflight:${requestKey}`, promise);
    
    const result = await promise;
    
    // Clear inflight and cache result
    ctx.cache.delete(`inflight:${requestKey}`);
    if (input.method === 'GET') {
      ctx.cache.set(requestKey, result);
    }
    
    return result;
  })
  .render(({ data, loading }) => {
    if (loading) return <div className="animate-pulse">Fetching data...</div>;
    if (!data) return null;
    return (
      <pre className="p-3 bg-gray-900 text-green-400 rounded-lg overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  });

// Export advanced tools
export * from '../tools/advanced-examples';