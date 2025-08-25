import React from 'react';
import aui from '@/lib/aui';
import { z } from 'zod';

// Simple tool - just 2 methods (execute & render)
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
    // Server-side: Direct database access
    const response = await fetch(`/api/search?q=${input.query}`);
    return response.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: Use cache when available
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
    <div className="search-results">
      {data.results?.map((item: any) => (
        <div key={item.id}>{item.title}</div>
      ))}
    </div>
  ));

// Form control tool
const formTool = aui
  .tool('form')
  .input(z.object({ 
    field: z.string(),
    value: z.any()
  }))
  .execute(async ({ input }) => {
    // Update form state
    return { updated: input.field, value: input.value };
  })
  .render(({ data }) => (
    <div>Updated {data.updated}: {JSON.stringify(data.value)}</div>
  ));

// Navigation tool
const navigationTool = aui
  .tool('navigate')
  .input(z.object({ path: z.string() }))
  .clientExecute(async ({ input }) => {
    window.location.href = input.path;
    return { navigated: true, path: input.path };
  })
  .render(({ data }) => <div>Navigating to {data.path}...</div>);

// Data visualization tool
const chartTool = aui
  .tool('chart')
  .input(z.object({
    type: z.enum(['bar', 'line', 'pie']),
    data: z.array(z.object({
      label: z.string(),
      value: z.number()
    }))
  }))
  .execute(async ({ input }) => input)
  .render(({ data }) => (
    <div className="chart">
      <h3>{data.type} Chart</h3>
      {data.data.map(item => (
        <div key={item.label}>
          {item.label}: {item.value}
        </div>
      ))}
    </div>
  ));

// Demo component showing usage
export function AUIDemo() {
  const [results, setResults] = React.useState<any[]>([]);
  
  const handleWeather = async () => {
    const result = await weatherTool.run({ city: 'San Francisco' });
    setResults(prev => [...prev, { tool: 'weather', data: result }]);
  };
  
  const handleSearch = async () => {
    const result = await searchTool.run({ query: 'AI tools' });
    setResults(prev => [...prev, { tool: 'search', data: result }]);
  };
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">AUI Demo</h1>
      
      <div className="space-x-4 mb-8">
        <button onClick={handleWeather} className="px-4 py-2 bg-blue-500 text-white rounded">
          Get Weather
        </button>
        <button onClick={handleSearch} className="px-4 py-2 bg-green-500 text-white rounded">
          Search
        </button>
      </div>
      
      <div className="space-y-4">
        {results.map((result, i) => (
          <div key={i} className="p-4 border rounded">
            <h3 className="font-semibold">{result.tool}</h3>
            <pre>{JSON.stringify(result.data, null, 2)}</pre>
          </div>
        ))}
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Tool Renderers</h2>
        {weatherTool.renderer && weatherTool.renderer({ 
          data: { city: 'San Francisco', temp: 72 } 
        })}
        {chartTool.renderer && chartTool.renderer({
          data: {
            type: 'bar',
            data: [
              { label: 'Q1', value: 100 },
              { label: 'Q2', value: 150 }
            ]
          }
        })}
      </div>
    </div>
  );
}

// Export all tools for AI control
export const aiTools = {
  weather: weatherTool,
  search: searchTool,
  form: formTool,
  navigate: navigationTool,
  chart: chartTool
};