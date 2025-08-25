'use client';

import React, { useState } from 'react';
import { AUIProvider } from '@/lib/aui/provider';
import { useAUITool } from '@/lib/aui/hooks/useAUITool';
import { tools } from '@/lib/aui/examples/tools';

function WeatherDemo() {
  const [city, setCity] = useState('San Francisco');
  const { execute, data, loading, error } = useAUITool(tools.weather);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await execute({ city });
  };
  
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3">Weather Tool (Simple)</h3>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Enter city"
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          Get Weather
        </button>
      </form>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">Error: {error.message}</div>}
      {data && tools.weather.renderer && tools.weather.renderer({ data })}
    </div>
  );
}

function SearchDemo() {
  const [query, setQuery] = useState('');
  const { execute, data, loading, error } = useAUITool(tools.search);
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      await execute({ query: query.trim(), limit: 5 });
    }
  };
  
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3">Search Tool (With Client Caching)</h3>
      <form onSubmit={handleSearch} className="flex gap-2 mb-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          Search
        </button>
      </form>
      {tools.search.renderer && tools.search.renderer({ data: data || [], loading, error })}
    </div>
  );
}

function CalculatorDemo() {
  const [expression, setExpression] = useState('2 + 2');
  const { execute, data, loading, error } = useAUITool(tools.calculator);
  
  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    await execute({ expression });
  };
  
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3">Calculator Tool</h3>
      <form onSubmit={handleCalculate} className="flex gap-2 mb-3">
        <input
          type="text"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder="Enter expression (e.g., 2 + 2)"
          className="flex-1 px-3 py-2 border rounded font-mono"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          Calculate
        </button>
      </form>
      {loading && <div>Calculating...</div>}
      {error && <div className="text-red-500">Error: {error.message}</div>}
      {data && tools.calculator.renderer && tools.calculator.renderer({ data })}
    </div>
  );
}

function AnalyticsDemo() {
  const [metric, setMetric] = useState<'views' | 'clicks' | 'conversions'>('views');
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const { execute, data, loading, error } = useAUITool(tools.analytics);
  
  const handleFetch = async () => {
    await execute({ metric, period });
  };
  
  return (
    <div className="border rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3">Analytics Tool (Complex)</h3>
      <div className="flex gap-2 mb-3">
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as any)}
          className="px-3 py-2 border rounded"
        >
          <option value="views">Views</option>
          <option value="clicks">Clicks</option>
          <option value="conversions">Conversions</option>
        </select>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as any)}
          className="px-3 py-2 border rounded"
        >
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
        </select>
        <button
          onClick={handleFetch}
          disabled={loading}
          className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
        >
          Fetch Analytics
        </button>
      </div>
      {loading && <div>Loading analytics...</div>}
      {error && <div className="text-red-500">Error: {error.message}</div>}
      {data && tools.analytics.renderer && tools.analytics.renderer({ data })}
    </div>
  );
}

export default function AUIShowcasePage() {
  return (
    <AUIProvider>
      <div className="container mx-auto p-6 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">AUI (Assistant-UI) System</h1>
        <p className="text-gray-600 mb-6">
          Clean, concise tool system for AI-controlled frontend and backend operations in Next.js
        </p>
        
        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-4">Tool Examples</h2>
            <div className="grid gap-6">
              <WeatherDemo />
              <SearchDemo />
              <CalculatorDemo />
              <AnalyticsDemo />
            </div>
          </section>
          
          <section className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-semibold mb-3">API Example</h2>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto">
              <code>{`// Simple tool - just execute and render
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)

// Complex tool - with client optimization
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)`}</code>
            </pre>
          </section>
        </div>
      </div>
    </AUIProvider>
  );
}