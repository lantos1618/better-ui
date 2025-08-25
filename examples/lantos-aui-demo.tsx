'use client';

import { useState } from 'react';
import { z } from 'zod';
import aui from '@/lib/aui/lantos';
import { useAUITool, useAUI } from '@/lib/aui/lantos/hooks';

// Simple tool - just 2 methods (input, execute, render)
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return { 
      temp: Math.floor(Math.random() * 30) + 60,
      city: input.city,
      conditions: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
    };
  })
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
  .input(z.object({ 
    query: z.string(),
    limit: z.number().optional().default(10)
  }))
  .execute(async ({ input }) => {
    // Server-side: Database search
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      results: Array.from({ length: input.limit }, (_, i) => ({
        id: i + 1,
        title: `Result ${i + 1} for "${input.query}"`,
        description: `This is a search result for your query: ${input.query}`,
        score: Math.random()
      })).sort((a, b) => b.score - a.score)
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: Check cache first
    const cacheKey = `search:${input.query}:${input.limit}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached) {
      console.log('Using cached results');
      return cached;
    }
    
    // Fall back to server
    const result = await ctx.fetch('/api/aui/lantos/execute', {
      method: 'POST',
      body: JSON.stringify({ tool: 'search', input })
    });
    
    // Cache for future use
    ctx.cache.set(cacheKey, result.result);
    return result.result;
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

// Demo Component
export default function LantosAUIDemo() {
  const [city, setCity] = useState('San Francisco');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Use individual tool hook
  const weather = useAUITool(weatherTool);
  const search = useAUITool(searchTool);
  
  // Or use the multi-tool hook
  const aui = useAUI();
  
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Lantos AUI Demo</h1>
      
      {/* Weather Tool Demo */}
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
        
        {weather.data && weather.render?.()}
      </section>
      
      {/* Search Tool Demo */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Complex Tool: Search (with caching)</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for something..."
            className="px-3 py-2 border rounded flex-1"
          />
          <button
            onClick={() => search.execute({ query: searchQuery, limit: 5 })}
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
      
      {/* Multi-Tool Demo */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Multi-Tool Management</h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={async () => {
              await aui.executeTool('weather', { city: 'Tokyo' });
            }}
            disabled={aui.isLoading('weather')}
            className="p-4 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            {aui.isLoading('weather') ? 'Loading...' : 'Get Tokyo Weather'}
          </button>
          
          <button
            onClick={async () => {
              await aui.executeTool('search', { query: 'AI tools', limit: 3 });
            }}
            disabled={aui.isLoading('search')}
            className="p-4 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
          >
            {aui.isLoading('search') ? 'Searching...' : 'Search AI Tools'}
          </button>
        </div>
        
        {/* Display results */}
        <div className="mt-6 space-y-4">
          {aui.getResult('weather') && (
            <div className="p-4 bg-purple-50 rounded">
              <h3 className="font-bold">Tokyo Weather Result:</h3>
              <pre className="text-sm">{JSON.stringify(aui.getResult('weather'), null, 2)}</pre>
            </div>
          )}
          
          {aui.getResult('search') && (
            <div className="p-4 bg-indigo-50 rounded">
              <h3 className="font-bold">Search Result:</h3>
              <pre className="text-sm">{JSON.stringify(aui.getResult('search'), null, 2)}</pre>
            </div>
          )}
        </div>
      </section>
      
      {/* Code Example */}
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
  );
}