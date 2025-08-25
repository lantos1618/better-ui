'use client';

import React from 'react';
import aui from '../index';
import { z } from 'zod';

// Simple tool - just 2 methods
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side: database search
    return { results: [`Result for ${input.query}`] };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: cache-first strategy
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      body: JSON.stringify(input)
    }).then(r => r.json());
    
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <div>
      <h3>Search Results</h3>
      <ul>
        {data.results?.map((item: string, i: number) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  ));

// Export tools for use in components
export { weatherTool, searchTool };

// Demo component
export function QuickDemo() {
  const [weatherData, setWeatherData] = React.useState<any>(null);
  const [searchData, setSearchData] = React.useState<any>(null);

  const handleWeather = async () => {
    const data = await weatherTool.run({ city: 'San Francisco' });
    setWeatherData(data);
  };

  const handleSearch = async () => {
    const data = await searchTool.run({ query: 'AI tools' });
    setSearchData(data);
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">AUI Quick Demo</h2>
      
      <div className="space-y-2">
        <button 
          onClick={handleWeather}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Get Weather
        </button>
        {weatherData && weatherTool.renderer && 
          weatherTool.renderer({ data: weatherData })}
      </div>

      <div className="space-y-2">
        <button 
          onClick={handleSearch}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Search
        </button>
        {searchData && searchTool.renderer && 
          searchTool.renderer({ data: searchData })}
      </div>
    </div>
  );
}