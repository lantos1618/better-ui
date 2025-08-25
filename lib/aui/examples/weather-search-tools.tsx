import React from 'react';
import { z } from 'zod';
import aui from '../index';

// Simple tool - just 2 methods (input, execute, render)
export const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: 72, 
    city: input.city,
    conditions: 'Sunny',
    humidity: 65
  }))
  .render(({ data }) => (
    <div className="p-4 bg-blue-50 rounded-lg">
      <h3 className="font-bold text-lg">{data.city}</h3>
      <p className="text-2xl">{data.temp}°F</p>
      <p className="text-gray-600">{data.conditions}</p>
      <p className="text-sm">Humidity: {data.humidity}%</p>
    </div>
  ));

// Mock database search function
const mockDbSearch = async (query: string) => {
  await new Promise(resolve => setTimeout(resolve, 100));
  return [
    { id: 1, title: `Result for "${query}"`, score: 0.95 },
    { id: 2, title: `Another match for "${query}"`, score: 0.87 },
    { id: 3, title: `Related to "${query}"`, score: 0.72 }
  ];
};

// Complex tool - adds client optimization
export const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => mockDbSearch(input.query))
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached) {
      console.log(`Cache hit for query: ${input.query}`);
      return cached;
    }
    
    console.log(`Cache miss for query: ${input.query}, fetching...`);
    const results = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(res => res.json());
    
    ctx.cache.set(cacheKey, results);
    return results;
  })
  .render(({ data }) => (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="font-bold mb-3">Search Results</h3>
      <ul className="space-y-2">
        {data.map((result: any) => (
          <li key={result.id} className="bg-white p-2 rounded shadow-sm">
            <div className="font-medium">{result.title}</div>
            <div className="text-sm text-gray-500">Score: {result.score}</div>
          </li>
        ))}
      </ul>
    </div>
  ));

// Demo component showing both tools in action
export function WeatherSearchDemo() {
  const [weatherData, setWeatherData] = React.useState<any>(null);
  const [searchResults, setSearchResults] = React.useState<any>(null);
  
  const handleWeatherSearch = async () => {
    const result = await weatherTool.run({ city: 'San Francisco' });
    setWeatherData(result);
  };
  
  const handleSearch = async () => {
    const results = await searchTool.run({ query: 'TypeScript patterns' });
    setSearchResults(results);
  };
  
  return (
    <div className="p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">AUI Tool Examples</h2>
        
        <div className="space-y-4">
          <div>
            <button
              onClick={handleWeatherSearch}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Get Weather for San Francisco
            </button>
            {weatherData && weatherTool.renderer && 
              weatherTool.renderer({ data: weatherData })}
          </div>
          
          <div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Search for TypeScript patterns
            </button>
            {searchResults && searchTool.renderer && 
              searchTool.renderer({ data: searchResults })}
          </div>
        </div>
      </div>
    </div>
  );
}