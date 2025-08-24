import { aui } from '@/lib/aui/lantos-aui';
import { z } from 'zod';
import React from 'react';

// Simple tool - just 2 methods minimum!
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }));

// With rendering
const weatherWithUI = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side execution (database call)
    console.log('Server search:', input.query);
    return { results: [`Result for ${input.query}`] };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side optimization with caching
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify(input) 
    });
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <div>
      <h3>Search Results</h3>
      {data.results.map((item, i) => <div key={i}>{item}</div>)}
    </div>
  ));

// Usage in React component
export function QuickstartDemo() {
  const [weatherData, setWeatherData] = React.useState<any>(null);
  const [searchData, setSearchData] = React.useState<any>(null);

  const handleWeather = async () => {
    const result = await weatherWithUI.run({ city: 'NYC' });
    setWeatherData(result);
  };

  const handleSearch = async () => {
    const result = await complexTool.run(
      { query: 'AI tools' },
      { 
        cache: new Map(),
        fetch: window.fetch.bind(window)
      }
    );
    setSearchData(result);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">AUI Quickstart</h1>
      
      <div className="space-y-4">
        <div>
          <button 
            onClick={handleWeather}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Get Weather
          </button>
          {weatherData && weatherWithUI.renderResult(weatherData)}
        </div>

        <div>
          <button 
            onClick={handleSearch}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Search
          </button>
          {searchData && complexTool.renderResult(searchData)}
        </div>
      </div>
    </div>
  );
}

// AI Control Examples
const aiControlExamples = {
  // Frontend control - AI can update UI components
  updateUI: aui
    .tool('updateUI')
    .input(z.object({ 
      component: z.string(), 
      props: z.record(z.any()) 
    }))
    .execute(async ({ input }) => {
      console.log('AI updating component:', input.component, input.props);
      return { success: true, component: input.component };
    }),

  // Backend control - AI can execute database operations
  database: aui
    .tool('database')
    .input(z.object({ 
      operation: z.enum(['read', 'write', 'update', 'delete']),
      table: z.string(),
      data: z.any()
    }))
    .execute(async ({ input }) => {
      console.log('AI database operation:', input);
      // In real app: await db[input.operation](input.table, input.data)
      return { success: true, operation: input.operation };
    }),

  // Full-stack control - AI orchestrates frontend and backend
  fullStack: aui
    .tool('fullStack')
    .input(z.object({
      frontend: z.object({ action: z.string(), target: z.string() }),
      backend: z.object({ endpoint: z.string(), method: z.string() })
    }))
    .execute(async ({ input }) => {
      // Backend execution
      console.log('Backend:', input.backend);
      return { backend: 'executed', frontend: 'pending' };
    })
    .clientExecute(async ({ input, ctx }) => {
      // Frontend execution
      console.log('Frontend:', input.frontend);
      const backendResult = await ctx.fetch(input.backend.endpoint, {
        method: input.backend.method
      });
      return { backend: backendResult, frontend: 'executed' };
    })
};

export { simpleTool, complexTool, aiControlExamples };