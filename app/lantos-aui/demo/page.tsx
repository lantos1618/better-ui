'use client';

import { useState } from 'react';
import aui from '@/lib/aui/lantos-concise';
import { z } from 'zod';

// Register tools for this demo
const weatherTool = aui.register(
  aui
    .tool('weather')
    .description('Get weather for a city')
    .input(z.object({ city: z.string() }))
    .execute(async ({ input }) => ({ 
      temp: Math.floor(Math.random() * 30) + 60,
      city: input.city,
      conditions: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)]
    }))
    .cache(30000)
    .render(({ data }) => (
      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="font-bold">{data.city}</h3>
        <p className="text-2xl">{data.temp}°F</p>
        <p className="text-gray-600">{data.conditions}</p>
      </div>
    ))
);

const searchTool = aui.register(
  aui
    .tool('search')
    .description('Search with caching')
    .input(z.object({ query: z.string() }))
    .execute(async ({ input }) => ({
      results: [
        `Result 1 for "${input.query}"`,
        `Result 2 for "${input.query}"`,
        `Result 3 for "${input.query}"`
      ],
      count: 3
    }))
    .cache(60000)
    .retry(2)
    .render(({ data }) => (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="font-semibold mb-2">Found {data.count} results</p>
        <ul className="space-y-1">
          {data.results.map((r, i) => (
            <li key={i} className="text-sm text-gray-700">• {r}</li>
          ))}
        </ul>
      </div>
    ))
);

const calculatorTool = aui.register(
  aui
    .tool('calculator')
    .description('Basic math operations')
    .input(z.object({ 
      a: z.number(), 
      b: z.number(), 
      op: z.enum(['+', '-', '*', '/']) 
    }))
    .execute(async ({ input }) => {
      const ops = {
        '+': (a: number, b: number) => a + b,
        '-': (a: number, b: number) => a - b,
        '*': (a: number, b: number) => a * b,
        '/': (a: number, b: number) => a / b
      };
      return { 
        result: ops[input.op](input.a, input.b),
        expression: `${input.a} ${input.op} ${input.b}`
      };
    })
    .render(({ data }) => (
      <div className="p-4 bg-green-50 rounded-lg">
        <p className="text-lg font-mono">
          {data.expression} = <span className="font-bold">{data.result}</span>
        </p>
      </div>
    ))
);

export default function LantosAUIDemoPage() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const executeWeather = async () => {
    setLoading(prev => ({ ...prev, weather: true }));
    setErrors(prev => ({ ...prev, weather: '' }));
    try {
      const result = await weatherTool.run({ city: 'San Francisco' });
      setResults(prev => ({ ...prev, weather: result }));
    } catch (error) {
      setErrors(prev => ({ ...prev, weather: (error as Error).message }));
    } finally {
      setLoading(prev => ({ ...prev, weather: false }));
    }
  };

  const executeSearch = async () => {
    setLoading(prev => ({ ...prev, search: true }));
    setErrors(prev => ({ ...prev, search: '' }));
    try {
      const result = await searchTool.run({ query: 'AI tools' });
      setResults(prev => ({ ...prev, search: result }));
    } catch (error) {
      setErrors(prev => ({ ...prev, search: (error as Error).message }));
    } finally {
      setLoading(prev => ({ ...prev, search: false }));
    }
  };

  const executeCalculator = async () => {
    setLoading(prev => ({ ...prev, calc: true }));
    setErrors(prev => ({ ...prev, calc: '' }));
    try {
      const result = await calculatorTool.run({ a: 42, b: 8, op: '*' });
      setResults(prev => ({ ...prev, calc: result }));
    } catch (error) {
      setErrors(prev => ({ ...prev, calc: (error as Error).message }));
    } finally {
      setLoading(prev => ({ ...prev, calc: false }));
    }
  };

  const executeBatch = async () => {
    setLoading(prev => ({ ...prev, batch: true }));
    try {
      const batchResults = await aui.batch([
        { tool: 'weather', input: { city: 'New York' } },
        { tool: 'search', input: { query: 'Next.js' } },
        { tool: 'calculator', input: { a: 100, b: 25, op: '/' } }
      ]);
      setResults(prev => ({ ...prev, batch: batchResults }));
    } catch (error) {
      setErrors(prev => ({ ...prev, batch: (error as Error).message }));
    } finally {
      setLoading(prev => ({ ...prev, batch: false }));
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-4xl font-bold mb-8">Lantos AUI - Concise Tool System</h1>
      
      <div className="mb-8 p-6 bg-gray-100 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">What is AUI?</h2>
        <p className="text-gray-700 mb-2">
          AUI (Assistant UI) is a concise, fluent API for creating AI-controllable tools in Next.js applications.
        </p>
        <p className="text-gray-700">
          Define tools in just 2-4 method calls with built-in caching, retry logic, and client/server execution.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Simple Tool Example</h2>
          <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto">
{`const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: 72, 
    city: input.city 
  }))
  .render(({ data }) => 
    <div>{data.city}: {data.temp}°</div>
  )`}
          </pre>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Complex Tool Example</h2>
          <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto">
{`const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => 
    db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', 
      { body: input });
  })
  .cache(60000)
  .retry(3)
  .render(({ data }) => 
    <SearchResults results={data} />)`}
          </pre>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Interactive Demo</h2>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Weather Tool</h3>
            <button
              onClick={executeWeather}
              disabled={loading.weather}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              {loading.weather ? 'Loading...' : 'Get Weather'}
            </button>
            {errors.weather && <p className="text-red-500 mt-2">{errors.weather}</p>}
            {results.weather && !loading.weather && (
              <div className="mt-4">
                {weatherTool.definition.render?.({ 
                  data: results.weather,
                  loading: false
                })}
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Search Tool</h3>
            <button
              onClick={executeSearch}
              disabled={loading.search}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-300"
            >
              {loading.search ? 'Searching...' : 'Search'}
            </button>
            {errors.search && <p className="text-red-500 mt-2">{errors.search}</p>}
            {results.search && !loading.search && (
              <div className="mt-4">
                {searchTool.definition.render?.({ 
                  data: results.search,
                  loading: false
                })}
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Calculator Tool</h3>
            <button
              onClick={executeCalculator}
              disabled={loading.calc}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-300"
            >
              {loading.calc ? 'Calculating...' : 'Calculate'}
            </button>
            {errors.calc && <p className="text-red-500 mt-2">{errors.calc}</p>}
            {results.calc && !loading.calc && (
              <div className="mt-4">
                {calculatorTool.definition.render?.({ 
                  data: results.calc,
                  loading: false
                })}
              </div>
            )}
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Batch Execution</h3>
          <button
            onClick={executeBatch}
            disabled={loading.batch}
            className="px-6 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:bg-gray-300"
          >
            {loading.batch ? 'Running Batch...' : 'Execute All Tools'}
          </button>
          {errors.batch && <p className="text-red-500 mt-2">{errors.batch}</p>}
          {results.batch && !loading.batch && (
            <div className="mt-4 space-y-2">
              <p className="font-semibold">Batch Results:</p>
              <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                {JSON.stringify(results.batch, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Registered Tools</h3>
          <div className="space-y-2">
            {aui.list().map(tool => (
              <div key={tool.name} className="p-2 bg-gray-50 rounded">
                <span className="font-mono text-sm">{tool.name}</span>
                {tool.description && (
                  <span className="text-gray-600 text-sm ml-2">- {tool.description}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Key Features</h3>
        <ul className="space-y-1 text-gray-700">
          <li>✅ Fluent API - define tools in 2-4 method calls</li>
          <li>✅ Type-safe with Zod validation</li>
          <li>✅ Built-in caching with TTL</li>
          <li>✅ Automatic retry with exponential backoff</li>
          <li>✅ Timeout handling for long operations</li>
          <li>✅ Client/server execution separation</li>
          <li>✅ Tool registry for AI discovery</li>
          <li>✅ Batch execution support</li>
          <li>✅ React component rendering</li>
        </ul>
      </div>
    </div>
  );
}