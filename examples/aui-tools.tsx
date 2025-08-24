'use client';

import aui from '@/lib/aui-enhanced';
import { z } from 'zod';

// Simple weather tool - server execution
export const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => {
    // Simulated API call (would be real in production)
    const temps: Record<string, number> = {
      'New York': 72,
      'London': 65,
      'Tokyo': 78,
      'Sydney': 85
    };
    return { 
      temp: temps[input.city] || 70, 
      city: input.city,
      conditions: 'Partly cloudy'
    };
  })
  .render(({ data }) => (
    <div className="p-4 border rounded-lg bg-blue-50">
      <h3 className="font-bold text-lg">{data.city}</h3>
      <p className="text-2xl">{data.temp}°F</p>
      <p className="text-gray-600">{data.conditions}</p>
    </div>
  ));

// Complex search tool with client-side caching
export const searchTool = aui
  .tool('search')
  .input(z.object({ 
    query: z.string().min(1),
    limit: z.number().optional().default(10)
  }))
  .execute(async ({ input }) => {
    // Server-side database search
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate latency
    return {
      results: Array.from({ length: input.limit }, (_, i) => ({
        id: `${i + 1}`,
        title: `Result ${i + 1} for "${input.query}"`,
        description: `This is a search result for your query about ${input.query}`,
        score: Math.random()
      })).sort((a, b) => b.score - a.score)
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check client cache first
    const cacheKey = `search:${input.query}:${input.limit}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
      console.log('Using cached search results');
      return cached.data;
    }
    
    // Fetch from API
    const response = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    const data = await response.json();
    
    // Cache the results
    ctx.cache.set(cacheKey, { data, timestamp: Date.now() });
    
    return data;
  })
  .render(({ data, input }) => (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">
        Search Results for "{input?.query}" ({data.results.length})
      </h3>
      <div className="space-y-2">
        {data.results.map(result => (
          <div key={result.id} className="p-3 border rounded hover:bg-gray-50">
            <h4 className="font-semibold">{result.title}</h4>
            <p className="text-sm text-gray-600">{result.description}</p>
            <span className="text-xs text-gray-400">Score: {result.score.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  ))
  .cache(true)
  .retry(3)
  .timeout(5000);

// User profile tool with error handling
export const userTool = aui
  .tool('user')
  .input(z.object({ userId: z.string() }))
  .execute(async ({ input }) => {
    if (input.userId === 'error') {
      throw new Error('User not found');
    }
    return {
      id: input.userId,
      name: `User ${input.userId}`,
      email: `user${input.userId}@example.com`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${input.userId}`
    };
  })
  .render(({ data, error }) => {
    if (error) {
      return (
        <div className="p-4 border border-red-300 rounded bg-red-50">
          <p className="text-red-600">Error: {error.message}</p>
        </div>
      );
    }
    return (
      <div className="p-4 border rounded flex items-center gap-4">
        <img src={data.avatar} alt={data.name} className="w-16 h-16 rounded-full" />
        <div>
          <h3 className="font-bold">{data.name}</h3>
          <p className="text-sm text-gray-600">{data.email}</p>
        </div>
      </div>
    );
  })
  .onError((error, input) => {
    console.error(`Failed to fetch user ${input.userId}:`, error);
  });

// Calculator tool - pure client-side
export const calculatorTool = aui
  .tool('calculator')
  .input(z.object({
    a: z.number(),
    b: z.number(),
    operation: z.enum(['add', 'subtract', 'multiply', 'divide'])
  }))
  .clientExecute(async ({ input }) => {
    const operations = {
      add: (a: number, b: number) => a + b,
      subtract: (a: number, b: number) => a - b,
      multiply: (a: number, b: number) => a * b,
      divide: (a: number, b: number) => b !== 0 ? a / b : NaN
    };
    
    const result = operations[input.operation](input.a, input.b);
    
    return {
      a: input.a,
      b: input.b,
      operation: input.operation,
      result,
      expression: `${input.a} ${
        { add: '+', subtract: '-', multiply: '×', divide: '÷' }[input.operation]
      } ${input.b} = ${result}`
    };
  })
  .render(({ data }) => (
    <div className="p-4 border rounded bg-green-50">
      <p className="text-xl font-mono">{data.expression}</p>
    </div>
  ));

// Data fetcher with smart caching
export const dataFetcher = aui
  .tool('dataFetcher')
  .input(z.object({
    endpoint: z.string(),
    method: z.enum(['GET', 'POST']).optional().default('GET'),
    body: z.any().optional()
  }))
  .execute(async ({ input }) => {
    const response = await fetch(input.endpoint, {
      method: input.method,
      headers: input.body ? { 'Content-Type': 'application/json' } : undefined,
      body: input.body ? JSON.stringify(input.body) : undefined
    });
    return await response.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    // Smart client-side caching for GET requests
    if (input.method === 'GET') {
      const cached = ctx.cache.get(input.endpoint);
      if (cached) {
        console.log('Using cached data for', input.endpoint);
        return cached;
      }
    }
    
    const response = await ctx.fetch(input.endpoint, {
      method: input.method,
      headers: input.body ? { 'Content-Type': 'application/json' } : undefined,
      body: input.body ? JSON.stringify(input.body) : undefined
    });
    
    const data = await response.json();
    
    // Cache GET requests
    if (input.method === 'GET') {
      ctx.cache.set(input.endpoint, data);
    }
    
    return data;
  })
  .render(({ data }) => (
    <pre className="p-4 bg-gray-100 rounded overflow-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  ))
  .cache(60000) // Cache for 1 minute
  .retry(2)
  .timeout(10000);