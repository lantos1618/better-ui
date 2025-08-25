'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { aui, LantosContext } from '@/lib/aui/lantos';

// Create a context with caching
const createContext = (): LantosContext => ({
  cache: new Map(),
  fetch: async (url: string, options?: any) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    return response.json();
  },
  user: { id: 1, name: 'Demo User' },
  session: { token: 'demo-token' },
  metrics: { startTime: Date.now() }
});

// Weather tool with middleware for logging
const weatherTool = aui
  .tool('weather')
  .describe('Get weather information for a city')
  .input(z.object({ 
    city: z.string().min(1),
    units: z.enum(['celsius', 'fahrenheit']).optional().default('celsius')
  }))
  .use(async ({ input, next }) => {
    console.log(`[Middleware] Fetching weather for ${input.city}`);
    const startTime = Date.now();
    const result = await next();
    console.log(`[Middleware] Weather fetched in ${Date.now() - startTime}ms`);
    return result;
  })
  .execute(async ({ input }) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    const temp = Math.round(20 + Math.random() * 15);
    return { 
      city: input.city, 
      temp: input.units === 'fahrenheit' ? Math.round(temp * 9/5 + 32) : temp,
      units: input.units,
      conditions: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
      humidity: Math.round(40 + Math.random() * 40)
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    const cacheKey = `weather-${input.city}-${input.units}`;
    if (ctx.cache.has(cacheKey)) {
      console.log(`[Cache] Using cached weather for ${input.city}`);
      return ctx.cache.get(cacheKey);
    }
    const result = await ctx.fetch('/api/aui/execute', {
      method: 'POST',
      body: JSON.stringify({ tool: 'weather', input })
    });
    ctx.cache.set(cacheKey, result);
    return result;
  })
  .retry(3, 500)
  .meta({ category: 'weather', version: '1.0' })
  .render(({ data, loading, error }) => {
    if (loading) return <div className="p-4 border rounded animate-pulse">Loading weather...</div>;
    if (error) return <div className="p-4 border rounded bg-red-50 text-red-600">Error: {error.message}</div>;
    return (
      <div className="p-4 border rounded bg-blue-50">
        <h3 className="font-bold text-lg">{data.city}</h3>
        <p className="text-2xl font-mono">
          {data.temp}°{data.units === 'fahrenheit' ? 'F' : 'C'}
        </p>
        <p className="text-gray-600">
          {data.conditions} • {data.humidity}% humidity
        </p>
      </div>
    );
  });

// Search tool with streaming support
const searchTool = aui
  .tool('search')
  .describe('Search for content with streaming results')
  .input(z.object({ 
    query: z.string().min(1),
    limit: z.number().optional().default(5)
  }))
  .execute(async ({ input }) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      query: input.query,
      results: Array.from({ length: input.limit }, (_, i) => ({
        id: i + 1,
        title: `Result ${i + 1} for "${input.query}"`,
        description: `This is the description for result ${i + 1}`,
        relevance: Math.random()
      })).sort((a, b) => b.relevance - a.relevance)
    };
  })
  .stream(async function* ({ input, options }) {
    const results = [];
    for (let i = 0; i < input.limit; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const result = {
        id: i + 1,
        title: `Result ${i + 1} for "${input.query}"`,
        description: `Streaming result ${i + 1}`,
        relevance: Math.random()
      };
      results.push(result);
      yield result;
    }
  })
  .render(({ data, loading }) => {
    if (loading) return <div className="p-4 border rounded animate-pulse">Searching...</div>;
    return (
      <div className="p-4 border rounded">
        <h3 className="font-bold mb-2">Search Results for "{data.query}"</h3>
        <ul className="space-y-2">
          {data.results.map((result: any) => (
            <li key={result.id} className="p-2 bg-gray-50 rounded">
              <div className="font-semibold">{result.title}</div>
              <div className="text-sm text-gray-600">{result.description}</div>
              <div className="text-xs text-gray-400">Relevance: {(result.relevance * 100).toFixed(0)}%</div>
            </li>
          ))}
        </ul>
      </div>
    );
  });

// Calculator tool with validation
const calculatorTool = aui
  .tool('calculator')
  .describe('Perform mathematical calculations')
  .input(z.object({
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
    a: z.number(),
    b: z.number()
  }))
  .use(async ({ input, next }) => {
    // Validation middleware
    if (input.operation === 'divide' && input.b === 0) {
      throw new Error('Division by zero is not allowed');
    }
    return next();
  })
  .execute(async ({ input }) => {
    const operations = {
      add: (a: number, b: number) => a + b,
      subtract: (a: number, b: number) => a - b,
      multiply: (a: number, b: number) => a * b,
      divide: (a: number, b: number) => a / b
    };
    const result = operations[input.operation](input.a, input.b);
    return {
      operation: input.operation,
      a: input.a,
      b: input.b,
      result,
      expression: `${input.a} ${input.operation === 'add' ? '+' : input.operation === 'subtract' ? '-' : input.operation === 'multiply' ? '×' : '÷'} ${input.b} = ${result}`
    };
  })
  .render(({ data }) => (
    <div className="p-4 border rounded bg-green-50">
      <div className="font-mono text-xl">{data.expression}</div>
    </div>
  ));

// Register tools
aui.register(weatherTool);
aui.register(searchTool);
aui.register(calculatorTool);

export default function LantosAUIDemo() {
  const [results, setResults] = useState<any[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamResults, setStreamResults] = useState<any[]>([]);
  const ctx = createContext();

  // Demo weather execution
  const executeWeather = async () => {
    try {
      const result = await aui.execute('weather', { city: 'New York', units: 'celsius' }, ctx);
      setResults(prev => [...prev, { tool: 'weather', data: result }]);
    } catch (error) {
      console.error('Weather error:', error);
    }
  };

  // Demo search with streaming
  const executeStreamingSearch = async () => {
    setStreaming(true);
    setStreamResults([]);
    try {
      const generator = aui.stream('search', { query: 'AI tools', limit: 5 }, ctx, {
        onChunk: (chunk) => {
          setStreamResults(prev => [...prev, chunk]);
        },
        onComplete: () => {
          setStreaming(false);
        },
        onError: (error) => {
          console.error('Streaming error:', error);
          setStreaming(false);
        }
      });
      
      for await (const chunk of generator) {
        // Chunks are handled by onChunk callback
      }
    } catch (error) {
      console.error('Search error:', error);
      setStreaming(false);
    }
  };

  // Demo calculator
  const executeCalculator = async () => {
    try {
      const result = await aui.execute('calculator', { 
        operation: 'multiply', 
        a: 7, 
        b: 8 
      }, ctx);
      setResults(prev => [...prev, { tool: 'calculator', data: result }]);
    } catch (error) {
      console.error('Calculator error:', error);
    }
  };

  // Demo batch execution
  const executeBatch = async () => {
    const batchResults = await aui.executeBatch([
      { name: 'weather', input: { city: 'London' } },
      { name: 'calculator', input: { operation: 'add', a: 10, b: 20 } },
      { name: 'search', input: { query: 'TypeScript', limit: 3 } }
    ], ctx);
    
    batchResults.forEach((result, index) => {
      if (result.success) {
        setResults(prev => [...prev, { tool: ['weather', 'calculator', 'search'][index], data: result.data }]);
      }
    });
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Lantos AUI Demo - Enhanced Features</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Tool Registry</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          {aui.list().map(tool => (
            <div key={tool.name} className="p-3 border rounded bg-gray-50">
              <div className="font-semibold">{tool.name}</div>
              <div className="text-sm text-gray-600">{tool.description}</div>
              {tool.metadata && (
                <div className="text-xs text-gray-400 mt-1">
                  v{tool.metadata.version} • {tool.metadata.category}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Execute Tools</h2>
        <div className="flex gap-2 mb-4">
          <button
            onClick={executeWeather}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Get Weather
          </button>
          <button
            onClick={executeCalculator}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Calculate
          </button>
          <button
            onClick={executeStreamingSearch}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            disabled={streaming}
          >
            {streaming ? 'Streaming...' : 'Stream Search'}
          </button>
          <button
            onClick={executeBatch}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Batch Execute
          </button>
        </div>
      </div>

      {streamResults.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Streaming Results</h2>
          <div className="space-y-2">
            {streamResults.map((result, index) => (
              <div key={index} className="p-3 border rounded bg-purple-50 animate-slide-in">
                <div className="font-semibold">{result.title}</div>
                <div className="text-sm text-gray-600">{result.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Execution Results</h2>
          <div className="space-y-4">
            {results.map((result, index) => {
              const tool = aui.get(result.tool);
              if (!tool) return null;
              const Component = tool.render;
              return (
                <div key={index}>
                  <Component data={result.data} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-semibold mb-2">Features Demonstrated:</h3>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Fluent API with auto-finalization</li>
          <li>Middleware support for logging and validation</li>
          <li>Client-side caching with context</li>
          <li>Streaming support for real-time data</li>
          <li>Retry logic with exponential backoff</li>
          <li>Batch execution of multiple tools</li>
          <li>Tool metadata and descriptions</li>
          <li>Enhanced error handling in render props</li>
        </ul>
      </div>
    </div>
  );
}