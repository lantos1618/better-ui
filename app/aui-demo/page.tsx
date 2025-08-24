'use client';

import { useState } from 'react';
import aui, { z } from '@/lib/aui/lantos-aui';

// Simple tool - just 2 methods (minimum viable)
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
    // Server-side: database search
    await new Promise(r => setTimeout(r, 500));
    return { results: [`Result 1 for "${input.query}"`, `Result 2 for "${input.query}"`] };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: check cache first
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/aui/lantos/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'search', input })
    }).then(r => r.json());
    
    ctx.cache.set(input.query, result.result);
    return result.result;
  })
  .render(({ data }) => (
    <div>
      {data.results.map((r, i) => <div key={i}>{r}</div>)}
    </div>
  ));

export default function AUIDemo() {
  const [city, setCity] = useState('');
  const [query, setQuery] = useState('');
  const [weatherResult, setWeatherResult] = useState<any>(null);
  const [searchResult, setSearchResult] = useState<any>(null);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">AUI Demo - Concise AI Tool Control</h1>
      
      <div className="space-y-8">
        {/* Simple Tool Demo */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Simple Tool (2 methods)</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter city"
              className="px-3 py-2 border rounded flex-1"
            />
            <button
              onClick={async () => {
                const result = await simpleTool.run({ city: city || 'New York' });
                setWeatherResult(result);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Get Weather
            </button>
          </div>
          {weatherResult && simpleTool.renderResult(weatherResult)}
        </section>

        {/* Complex Tool Demo */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Complex Tool (with client caching)</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search query"
              className="px-3 py-2 border rounded flex-1"
            />
            <button
              onClick={async () => {
                const ctx = aui.createContext();
                const result = await complexTool.run({ query: query || 'AI' }, ctx);
                setSearchResult(result);
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Search
            </button>
          </div>
          {searchResult && complexTool.renderResult(searchResult)}
        </section>

        {/* Code Example */}
        <section className="bg-gray-900 text-gray-100 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Code Pattern</h2>
          <pre className="text-sm overflow-x-auto">
{`// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)

// Complex tool - adds client optimization
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
        </section>
      </div>
    </div>
  );
}