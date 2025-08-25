'use client';

import React, { useState } from 'react';
import aui, { z } from '@/lib/aui';

// Define your tools with the concise API
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: Math.round(50 + Math.random() * 40), 
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

const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulate database search
    await new Promise(r => setTimeout(r, 500));
    return Array.from({ length: 3 }, (_, i) => ({
      id: i + 1,
      title: `Result ${i + 1} for "${input.query}"`,
      description: `This is a search result for your query: ${input.query}`
    }));
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached) {
      console.log('Using cached results');
      return cached;
    }
    
    // Simulate API call - execute server handler directly
    await new Promise(r => setTimeout(r, 500));
    const results = Array.from({ length: 3 }, (_, i) => ({
      id: i + 1,
      title: `Result ${i + 1} for "${input.query}"`,
      description: `This is a search result for your query: ${input.query}`
    }));
    ctx.cache.set(cacheKey, results);
    return results;
  })
  .render(({ data, loading }) => (
    <div className="space-y-2">
      {loading && <div>Searching...</div>}
      {data?.map((item) => (
        <div key={item.id} className="p-3 bg-white border rounded-lg">
          <h4 className="font-semibold">{item.title}</h4>
          <p className="text-sm text-gray-600">{item.description}</p>
        </div>
      ))}
    </div>
  ));

export default function AUIDemo() {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [city, setCity] = useState('');
  const [query, setQuery] = useState('');
  const cache = new Map();

  const handleWeather = async () => {
    if (!city) return;
    const result = await weatherTool.run({ city });
    setWeatherData(result);
  };

  const handleSearch = async () => {
    if (!query) return;
    const result = await searchTool.run(
      { query }, 
      { cache, fetch: globalThis.fetch, isServer: false }
    );
    setSearchResults(result);
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">AUI (Assistant-UI) Demo</h1>
        <p className="text-gray-600">
          Clean, concise API for AI-controlled frontend and backend operations
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Weather Tool Demo */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Weather Tool</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter city name"
              className="flex-1 px-3 py-2 border rounded-lg"
            />
            <button
              onClick={handleWeather}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Get Weather
            </button>
          </div>
          {weatherData && weatherTool.renderer?.({ data: weatherData })}
        </div>

        {/* Search Tool Demo */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Search Tool (with caching)</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search query"
              className="flex-1 px-3 py-2 border rounded-lg"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              Search
            </button>
          </div>
          {searchResults && searchTool.renderer?.({ data: searchResults })}
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Code Example:</h3>
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
      </div>
    </div>
  );
}