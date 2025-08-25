'use client';

import React, { useState } from 'react';
import aui from '@/lib/aui';
import { z } from 'zod';
import { useAUITool } from '@/lib/aui';

// Simple tool - just 2 methods as requested
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div className="p-4 bg-blue-50 rounded">{data.city}: {data.temp}°F</div>);

// Complex tool - adds client optimization
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulating database search
    await new Promise(r => setTimeout(r, 500));
    return [
      { id: 1, title: `Result for "${input.query}"`, content: 'First matching result' },
      { id: 2, title: `Another match for "${input.query}"`, content: 'Second result' }
    ];
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first for optimization
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    // In production, this would call your API
    const results = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input) 
    }).then(r => r.json()).catch(() => [
      { id: 1, title: `Client result for "${input.query}"`, content: 'Fallback result' }
    ]);
    
    ctx.cache.set(input.query, results);
    return results;
  })
  .render(({ data, loading }) => (
    <div className="space-y-2">
      {loading && <div>Searching...</div>}
      {data?.map((item: any) => (
        <div key={item.id} className="p-3 border rounded hover:bg-gray-50">
          <h4 className="font-semibold">{item.title}</h4>
          <p className="text-sm text-gray-600">{item.content}</p>
        </div>
      ))}
    </div>
  ));

export default function AUIDemo() {
  const [city, setCity] = useState('New York');
  const [query, setQuery] = useState('');
  const [weatherData, setWeatherData] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any>(null);

  const handleWeather = async () => {
    const result = await weatherTool.run({ city });
    setWeatherData(result);
  };

  const handleSearch = async () => {
    if (!query) return;
    const results = await searchTool.run({ query });
    setSearchResults(results);
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">AUI (Assistant-UI) Demo</h1>
      
      <div className="space-y-8">
        {/* Simple Tool Demo */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Simple Tool - Weather</h2>
          <p className="text-gray-600 mb-4">Just 2 methods: input() and execute()</p>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter city"
              className="px-3 py-2 border rounded"
            />
            <button
              onClick={handleWeather}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Get Weather
            </button>
          </div>
          
          {weatherData && weatherTool.renderer && 
            weatherTool.renderer({ data: weatherData, loading: false })}
        </section>

        {/* Complex Tool Demo */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Complex Tool - Search</h2>
          <p className="text-gray-600 mb-4">Adds clientExecute() for caching/optimization</p>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search query"
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Search
            </button>
          </div>
          
          {searchResults && searchTool.renderer && 
            searchTool.renderer({ data: searchResults, loading: false })}
        </section>

        {/* Code Example */}
        <section className="border rounded-lg p-6 bg-gray-50">
          <h2 className="text-xl font-semibold mb-4">How It Works</h2>
          <pre className="text-sm overflow-x-auto">
            <code>{`// Simple tool - just 2 methods
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
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)`}</code>
          </pre>
        </section>
      </div>
    </div>
  );
}