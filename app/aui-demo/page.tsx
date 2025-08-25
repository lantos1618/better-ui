'use client';

import React, { useState } from 'react';
import aui, { z } from '@/lib/aui';
import { useAUI, useAUIBatch } from '@/lib/aui/hooks';

// Simple weather tool
const weatherTool = aui
  .tool('weather')
  .description('Get weather information for a city')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    return { 
      city: input.city, 
      temp: Math.round(50 + Math.random() * 40),
      condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)]
    };
  })
  .render(({ data }) => (
    <div className="p-4 bg-blue-50 rounded-lg">
      <h3 className="font-bold text-lg">{data.city}</h3>
      <p className="text-2xl">{data.temp}°F</p>
      <p className="text-gray-600">{data.condition}</p>
    </div>
  ));

// Complex search tool with caching
const searchTool = aui
  .tool('search')
  .description('Search for content with caching')
  .input(z.object({ 
    query: z.string().min(1),
    limit: z.number().optional().default(10)
  }))
  .cache(60000) // Cache for 1 minute
  .retry(3)
  .timeout(5000)
  .execute(async ({ input }) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      query: input.query,
      results: Array.from({ length: input.limit }, (_, i) => ({
        id: i + 1,
        title: `Result ${i + 1} for "${input.query}"`,
        score: Math.random()
      })).sort((a, b) => b.score - a.score)
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    if (cached) return cached;
    
    // Fetch from server
    const response = await ctx.fetch('/api/aui/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'search', input })
    });
    
    const result = await response.json();
    ctx.cache.set(cacheKey, result.data);
    return result.data;
  })
  .render(({ data, loading }) => (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-bold mb-2">Search Results for "{data.query}"</h3>
      {loading ? (
        <p>Searching...</p>
      ) : (
        <ul className="space-y-2">
          {data.results.map((result: any) => (
            <li key={result.id} className="p-2 bg-white rounded shadow-sm">
              <span className="font-medium">{result.title}</span>
              <span className="ml-2 text-sm text-gray-500">
                Score: {result.score.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  ));

// Database tool with permissions
const dbTool = aui
  .tool('database')
  .description('Query database with permissions')
  .input(z.object({
    collection: z.enum(['users', 'posts', 'comments']),
    operation: z.enum(['find', 'count']),
    filter: z.record(z.any()).optional()
  }))
  .permissions('db:read')
  .execute(async ({ input }) => {
    // Simulate database query
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (input.operation === 'count') {
      return { count: Math.floor(Math.random() * 1000) };
    }
    
    return {
      data: Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        collection: input.collection,
        created: new Date().toISOString()
      }))
    };
  });

export default function AUIDemo() {
  const [city, setCity] = useState('New York');
  const [query, setQuery] = useState('');
  const [batchResults, setBatchResults] = useState<any[]>([]);
  
  const weather = useAUI(weatherTool);
  const search = useAUI('search');
  const batch = useAUIBatch();
  
  const handleWeatherSearch = () => {
    weather.execute({ city });
  };
  
  const handleSearch = () => {
    if (query) {
      search.execute({ query, limit: 5 });
    }
  };
  
  const handleBatchExecute = async () => {
    const results = await batch.executeBatch([
      { tool: 'weather', input: { city: 'London' } },
      { tool: 'weather', input: { city: 'Tokyo' } },
      { tool: 'search', input: { query: 'test', limit: 3 } }
    ]);
    setBatchResults(results);
  };
  
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">AUI Demo - Concise Tool System</h1>
      
      {/* Simple Weather Tool */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Simple Weather Tool</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter city name"
            className="px-3 py-2 border rounded"
          />
          <button
            onClick={handleWeatherSearch}
            disabled={weather.loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {weather.loading ? 'Loading...' : 'Get Weather'}
          </button>
        </div>
        
        {weather.error && (
          <div className="text-red-500 mb-4">Error: {weather.error.message}</div>
        )}
        
        {weather.data && weatherTool.definition.render && (
          React.createElement(weatherTool.definition.render, { 
            data: weather.data,
            loading: weather.loading
          })
        )}
      </section>
      
      {/* Complex Search Tool */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Complex Search Tool (with caching)</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search query"
            className="px-3 py-2 border rounded flex-1"
          />
          <button
            onClick={handleSearch}
            disabled={search.loading}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {search.loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        {search.error && (
          <div className="text-red-500 mb-4">Error: {search.error.message}</div>
        )}
        
        {search.data && searchTool.definition.render && (
          React.createElement(searchTool.definition.render, { 
            data: search.data,
            loading: search.loading
          })
        )}
      </section>
      
      {/* Batch Execution */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Batch Execution</h2>
        <button
          onClick={handleBatchExecute}
          disabled={batch.loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 mb-4"
        >
          {batch.loading ? 'Executing...' : 'Execute Batch'}
        </button>
        
        {batchResults.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold">Batch Results:</h3>
            {batchResults.map((result, index) => (
              <div key={index} className="p-4 bg-gray-100 rounded">
                <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </section>
      
      {/* Tool Registry Info */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Registered Tools</h2>
        <div className="p-4 bg-gray-50 rounded">
          <pre className="text-sm">
            {JSON.stringify(aui.list(), null, 2)}
          </pre>
        </div>
      </section>
      
      {/* Code Example */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Code Example</h2>
        <div className="p-4 bg-gray-900 text-gray-100 rounded overflow-x-auto">
          <pre className="text-sm">{`// Simple tool - just execute and render
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)

// Complex tool - with all features
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .cache(60000)              // Cache for 1 minute
  .retry(3)                  // Retry 3 times on failure
  .timeout(5000)             // 5 second timeout
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    // Optional client-side optimization
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)`}</pre>
        </div>
      </section>
    </div>
  );
}