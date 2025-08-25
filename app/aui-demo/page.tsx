'use client';

import { useState } from 'react';
import aui from '@/lib/aui';
import { z } from 'zod';
import { useAUITool } from '@/lib/aui/hooks/useAUITool';

// Simple tool - just 2 methods
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => {
    const response = await fetch('/api/tools/weather', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    return response.json();
  })
  .render(({ data }) => (
    <div className="p-4 bg-blue-50 rounded-lg">
      <h3 className="font-bold text-lg">{data.city}</h3>
      <p className="text-2xl">{data.temp}°F</p>
      <p className="text-gray-600">{data.condition}</p>
      <p className="text-sm">Wind: {data.wind} mph | Humidity: {data.humidity}%</p>
    </div>
  ));

// Complex tool - adds client optimization
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    const response = await fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    return response.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    if (cached) {
      console.log('Using cached result for:', input.query);
      return cached;
    }
    
    // Fetch from server
    const response = await fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    const data = await response.json();
    
    // Cache the result
    ctx.cache.set(cacheKey, data);
    return data;
  })
  .render(({ data }) => (
    <div className="p-4 bg-green-50 rounded-lg">
      <h3 className="font-bold text-lg mb-2">Search Results for "{data.query}"</h3>
      <p className="text-sm text-gray-500 mb-3">Found {data.count} results</p>
      {data.results?.map((result: any) => (
        <div key={result.id} className="mb-2 p-2 bg-white rounded">
          <p className="font-medium">{result.title}</p>
          <p className="text-sm text-gray-600">Score: {result.score}</p>
        </div>
      ))}
    </div>
  ));

function WeatherWidget() {
  const { execute, data, loading, error } = useAUITool(weatherTool);
  const [city, setCity] = useState('Tokyo');
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Weather Tool (Simple)</h2>
      <div className="flex gap-2">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city"
          className="px-3 py-2 border rounded"
        />
        <button
          onClick={() => execute({ city })}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Get Weather'}
        </button>
      </div>
      {error && <p className="text-red-500">Error: {error.message}</p>}
      {data && weatherTool.renderer && weatherTool.renderer({ data })}
    </div>
  );
}

function SearchWidget() {
  const { execute, data, loading, error } = useAUITool(searchTool);
  const [query, setQuery] = useState('AI tools');
  
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Search Tool (Complex with Client Caching)</h2>
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter search query"
          className="px-3 py-2 border rounded"
        />
        <button
          onClick={() => execute({ query })}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      <p className="text-sm text-gray-500">
        Try searching multiple times - subsequent searches will use cached results!
      </p>
      {error && <p className="text-red-500">Error: {error.message}</p>}
      {data && searchTool.renderer && searchTool.renderer({ data })}
    </div>
  );
}

export default function AUIDemo() {
  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">AUI (Assistant-UI) Tool System Demo</h1>
      
      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-bold mb-4">What is AUI?</h2>
        <p className="mb-4">
          AUI is a concise and elegant system for creating tools that AI can control 
          in both frontend and backend of Next.js/Vercel applications.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-bold mb-2">Simple Tool API:</h3>
            <pre className="bg-gray-800 text-white p-3 rounded text-xs overflow-x-auto">
{`const tool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => data)
  .render(({ data }) => <UI />)`}
            </pre>
          </div>
          <div>
            <h3 className="font-bold mb-2">Complex Tool with Caching:</h3>
            <pre className="bg-gray-800 text-white p-3 rounded text-xs overflow-x-auto">
{`const tool = aui
  .tool('search')
  .input(schema)
  .execute(serverHandler)
  .clientExecute(cacheHandler)
  .render(component)`}
            </pre>
          </div>
        </div>
      </div>
      
      <div className="space-y-8">
        <WeatherWidget />
        <SearchWidget />
      </div>
      
      <div className="mt-8 p-6 bg-yellow-50 rounded-lg">
        <h2 className="text-xl font-bold mb-4">AI Integration</h2>
        <p className="mb-2">
          AI agents can discover and use these tools programmatically:
        </p>
        <pre className="bg-gray-800 text-white p-3 rounded text-sm overflow-x-auto">
{`// AI can list all available tools
const tools = aui.getTools();

// AI can execute tools directly
const result = await weatherTool.run({ city: 'Tokyo' });

// Tools are fully typed with Zod schemas
const input = weatherTool.schema.parse(data);`}
        </pre>
      </div>
    </div>
  );
}