'use client';

import { useState } from 'react';
import { z } from 'zod';
import aui from '@/lib/aui';
import { useToolExecution } from '@/lib/aui/client';
import { AUIProvider, useAUI } from '@/lib/aui/hooks';

// Simple tool - just 2 methods
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: Math.floor(Math.random() * 30) + 60,
    city: input.city,
    conditions: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
  }))
  .render(({ data }) => (
    <div className="p-4 bg-blue-50 rounded-lg">
      <h3 className="font-bold text-lg">{data.city}</h3>
      <p className="text-2xl">{data.temp}°F</p>
      <p className="text-gray-600">{data.conditions}</p>
    </div>
  ));

// Complex tool - adds client optimization
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string(), limit: z.number().optional().default(10) }))
  .execute(async ({ input }) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      results: Array.from({ length: input.limit }, (_, i) => ({
        id: i + 1,
        title: `Result ${i + 1} for "${input.query}"`,
        description: `This is a search result for: ${input.query}`,
        score: Math.random()
      })).sort((a, b) => b.score - a.score)
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    const cacheKey = `search:${input.query}:${input.limit}`;
    const cached = ctx.cache.get(cacheKey);
    if (cached) return cached;
    
    const response = await ctx.fetch('/api/aui/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'search', input })
    });
    const data = await response.json();
    ctx.cache.set(cacheKey, data.result);
    return data.result;
  })
  .render(({ data }) => (
    <div className="space-y-2">
      <h3 className="font-bold">Search Results ({data.results.length})</h3>
      {data.results.map(result => (
        <div key={result.id} className="p-3 bg-gray-50 rounded">
          <h4 className="font-semibold">{result.title}</h4>
          <p className="text-sm text-gray-600">{result.description}</p>
          <span className="text-xs text-gray-400">Score: {result.score.toFixed(2)}</span>
        </div>
      ))}
    </div>
  ));

function WeatherDemo() {
  const [city, setCity] = useState('San Francisco');
  const weather = useToolExecution(weatherTool);

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-4">Simple Tool: Weather</h2>
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
      
      {weather.data && weather.render()}
    </section>
  );
}

function SearchDemo() {
  const [query, setQuery] = useState('');
  const search = useToolExecution(searchTool);

  return (
    <section className="mb-12">
      <h2 className="text-2xl font-semibold mb-4">Complex Tool: Search (with caching)</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for something..."
          className="px-3 py-2 border rounded flex-1"
        />
        <button
          onClick={() => search.execute({ query, limit: 5 })}
          disabled={search.loading || !query}
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
      
      {search.data && search.render()}
    </section>
  );
}

function MultiToolDemo() {
  const aui = useAUI();
  const [results, setResults] = useState<any>({});

  const runTool = async (toolName: string, input: any) => {
    try {
      const result = await aui.executeTool(toolName, input);
      setResults(prev => ({ ...prev, [toolName]: result }));
    } catch (error) {
      console.error(`Error running ${toolName}:`, error);
    }
  };

  return (
    <section>
      <h2 className="text-2xl font-semibold mb-4">Multi-Tool Management</h2>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => runTool('weather', { city: 'Tokyo' })}
          disabled={aui.loading.weather}
          className="p-4 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {aui.loading.weather ? 'Loading...' : 'Get Tokyo Weather'}
        </button>
        
        <button
          onClick={() => runTool('search', { query: 'AI tools', limit: 3 })}
          disabled={aui.loading.search}
          className="p-4 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
        >
          {aui.loading.search ? 'Searching...' : 'Search AI Tools'}
        </button>
      </div>
      
      <div className="mt-6 space-y-4">
        {results.weather && (
          <div className="p-4 bg-purple-50 rounded">
            <h3 className="font-bold">Tokyo Weather Result:</h3>
            <pre className="text-sm">{JSON.stringify(results.weather, null, 2)}</pre>
          </div>
        )}
        
        {results.search && (
          <div className="p-4 bg-indigo-50 rounded">
            <h3 className="font-bold">Search Result:</h3>
            <pre className="text-sm">{JSON.stringify(results.search, null, 2)}</pre>
          </div>
        )}
      </div>
    </section>
  );
}

export default function AUIShowcase() {
  return (
    <AUIProvider>
      <div className="container mx-auto p-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-8">AUI (Assistant UI) Showcase</h1>
        
        <WeatherDemo />
        <SearchDemo />
        <MultiToolDemo />
        
        <section className="mt-12 p-6 bg-gray-900 text-gray-100 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Usage Example</h2>
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
    </AUIProvider>
  );
}