'use client';

import aui, { z } from './lantos-aui';
import React from 'react';

// Simple tool - just 2 methods required
export const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: Math.round(50 + Math.random() * 40), 
    city: input.city,
    conditions: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
  }))
  .render(({ data }) => (
    <div className="p-4 bg-blue-50 rounded-lg">
      <h3 className="text-lg font-semibold">{data.city}</h3>
      <p className="text-2xl">{data.temp}°F</p>
      <p className="text-sm text-gray-600">{data.conditions}</p>
    </div>
  ));

// Complex tool with client-side caching
export const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulate server-side database search
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      query: input.query,
      results: [
        `Result 1 for "${input.query}"`,
        `Result 2 for "${input.query}"`,
        `Result 3 for "${input.query}"`,
      ],
      timestamp: new Date().toISOString()
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.cachedAt < 60000) { // 1 minute cache
      return { ...cached.data, fromCache: true };
    }
    
    // Fetch from API
    const result = await ctx.fetch('/api/aui/lantos', {
      method: 'POST',
      body: JSON.stringify({ tool: 'search', input })
    });
    
    // Cache the result
    ctx.cache.set(cacheKey, { data: result.data, cachedAt: Date.now() });
    return result.data;
  })
  .render(({ data }) => (
    <div className="p-4 border rounded-lg">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold">Search: {data.query}</h3>
        {data.fromCache && (
          <span className="text-xs bg-yellow-100 px-2 py-1 rounded">Cached</span>
        )}
      </div>
      <ul className="space-y-1">
        {data.results.map((r: string, i: number) => (
          <li key={i} className="text-sm text-gray-700">• {r}</li>
        ))}
      </ul>
      <p className="text-xs text-gray-500 mt-2">
        {new Date(data.timestamp).toLocaleTimeString()}
      </p>
    </div>
  ));

// One-liner tool
export const pingTool = aui.do('ping', () => 'pong');

// Simple tool using helper
export const greetTool = aui.simple(
  'greet',
  z.object({ name: z.string() }),
  ({ name }) => `Hello, ${name}!`,
  (message) => <h2 className="text-xl font-bold">{message}</h2>
);

// AI-optimized tool with retry
export const apiTool = aui.ai('apiCall', {
  input: z.object({ 
    endpoint: z.string(),
    retries: z.number().optional()
  }),
  execute: async ({ input }) => {
    // Simulate unreliable API
    if (Math.random() > 0.7) {
      throw new Error('API temporarily unavailable');
    }
    return { 
      success: true, 
      endpoint: input.endpoint,
      data: { message: 'API call successful' }
    };
  },
  render: ({ data }) => (
    <pre className="p-2 bg-gray-100 rounded text-xs">
      {JSON.stringify(data, null, 2)}
    </pre>
  ),
  retry: 3,
  cache: true
});

// Batch-defined tools
export const dbTools = aui.defineTools({
  query: {
    input: z.object({ sql: z.string() }),
    execute: async ({ input }) => {
      // Simulate database query
      return {
        sql: input.sql,
        rows: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ]
      };
    },
    render: ({ data }) => (
      <div className="p-3 bg-gray-50 rounded">
        <code className="text-xs text-gray-600">{data.sql}</code>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {data.rows.map((row: any) => (
              <tr key={row.id}>
                <td className="pr-4">{row.id}</td>
                <td>{row.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  },
  insert: {
    input: z.object({ table: z.string(), data: z.record(z.any()) }),
    execute: async ({ input }) => ({
      table: input.table,
      id: Date.now(),
      inserted: input.data
    }),
    render: ({ data }) => (
      <span className="text-green-600">
        Inserted into {data.table} with ID #{data.id}
      </span>
    )
  }
});

// Export all tools
export const allTools = {
  weatherTool,
  searchTool,
  pingTool,
  greetTool,
  apiTool,
  ...dbTools
};