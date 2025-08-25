'use client';

import { useState } from 'react';
import { z } from 'zod';
import aui from '@/lib/aui/lantos';
import { useAUITool, useAUI } from '@/lib/aui/lantos/hooks';

// Simple tool - just 2 methods (NO .build() required!)
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side database search
    const results = await new Promise<string[]>(resolve => 
      setTimeout(() => resolve([`Result for: ${input.query}`]), 100)
    );
    return { query: input.query, results };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify(input) 
    });
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <div className="p-4 border rounded">
      <h3 className="font-bold">Search: {data.query}</h3>
      <ul>
        {data.results.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
    </div>
  ));

// Export tools for demo
export const lantosTools = {
  simpleTool,
  complexTool
};

// Demo component
export function LantosAUIDemo() {
  const [city, setCity] = useState('San Francisco');
  const [searchQuery, setSearchQuery] = useState('');
  
  const weather = useAUITool(simpleTool);
  const search = useAUITool(complexTool);
  
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Lantos AUI - Ultra-Concise API</h1>
      
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Simple Tool Pattern</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm mb-4">
{`// Simple tool - just 2 methods (NO .build() required!)
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)`}
        </pre>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter city name"
            className="px-3 py-2 border rounded flex-1"
          />
          <button
            onClick={() => weather.execute({ city })}
            disabled={weather.loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {weather.loading ? 'Loading...' : 'Get Weather'}
          </button>
        </div>
        
        {weather.error && (
          <div className="p-3 bg-red-50 text-red-700 rounded mb-4">
            Error: {weather.error.message}
          </div>
        )}
        
        {weather.data && weather.render?.()}
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Complex Tool with Client Optimization</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm mb-4">
{`// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)`}
        </pre>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for something..."
            className="px-3 py-2 border rounded flex-1"
          />
          <button
            onClick={() => search.execute({ query: searchQuery })}
            disabled={search.loading || !searchQuery}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {search.loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        {search.error && (
          <div className="p-3 bg-red-50 text-red-700 rounded mb-4">
            Error: {search.error.message}
          </div>
        )}
        
        {search.data && search.render?.()}
      </section>

      <section className="mt-12 p-6 bg-gray-900 text-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Key Features</h2>
        <ul className="space-y-2 text-sm">
          <li>✅ No .build() required - tools are ready immediately</li>
          <li>✅ Full TypeScript inference throughout the chain</li>
          <li>✅ Server-side execution by default</li>
          <li>✅ Optional client-side optimization with caching</li>
          <li>✅ Built-in React component rendering</li>
          <li>✅ React hooks for easy integration</li>
        </ul>
      </section>
    </div>
  );
}

export default LantosAUIDemo;