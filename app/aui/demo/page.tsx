'use client';

import { useState } from 'react';
import { useAUI } from '@/lib/aui/client/use-aui';
import { weatherTool, searchTool, calculatorTool, dataFetcherTool } from '@/lib/aui/tools/examples';

export default function AUIDemo() {
  const [city, setCity] = useState('San Francisco');
  const [searchQuery, setSearchQuery] = useState('');
  const [expression, setExpression] = useState('2 + 2');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');

  const weather = useAUI(weatherTool);
  const search = useAUI(searchTool, { cache: true });
  const calculator = useAUI(calculatorTool);
  const fetcher = useAUI(dataFetcherTool, { cache: true });

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold mb-8">AUI (Assistant-UI) Demo</h1>

      {/* Weather Tool */}
      <section className="border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Weather Tool (Simple)</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Enter city"
            className="px-3 py-2 border rounded"
          />
          <button
            onClick={() => weather.execute({ city })}
            disabled={weather.loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {weather.loading ? 'Loading...' : 'Get Weather'}
          </button>
        </div>
        {weather.error && (
          <div className="text-red-500">Error: {weather.error.message}</div>
        )}
        {weather.data && weatherTool.renderer && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            {weatherTool.renderer({ data: weather.data })}
          </div>
        )}
      </section>

      {/* Search Tool */}
      <section className="border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Search Tool (With Client Cache)</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search query"
            className="px-3 py-2 border rounded flex-1"
          />
          <button
            onClick={() => search.execute({ query: searchQuery })}
            disabled={search.loading || !searchQuery}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {search.loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        {search.error && (
          <div className="text-red-500">Error: {search.error.message}</div>
        )}
        {search.data && searchTool.renderer && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            {searchTool.renderer({ data: search.data })}
          </div>
        )}
      </section>

      {/* Calculator Tool */}
      <section className="border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Calculator Tool</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="Math expression"
            className="px-3 py-2 border rounded flex-1"
          />
          <button
            onClick={() => calculator.execute({ expression })}
            disabled={calculator.loading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            {calculator.loading ? 'Calculating...' : 'Calculate'}
          </button>
        </div>
        {calculator.error && (
          <div className="text-red-500">Error: {calculator.error.message}</div>
        )}
        {calculator.data && calculatorTool.renderer && (
          <div className="mt-4 p-4 bg-gray-50 rounded">
            {calculatorTool.renderer({ data: calculator.data })}
          </div>
        )}
      </section>

      {/* Data Fetcher Tool */}
      <section className="border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Data Fetcher Tool (With Caching)</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL to fetch"
            className="px-3 py-2 border rounded flex-1"
          />
          <button
            onClick={() => fetcher.execute({ url })}
            disabled={fetcher.loading}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
          >
            {fetcher.loading ? 'Fetching...' : 'Fetch'}
          </button>
        </div>
        {fetcher.error && (
          <div className="text-red-500">Error: {fetcher.error.message}</div>
        )}
        {fetcher.data && dataFetcherTool.renderer && (
          <div className="mt-4 p-4 bg-gray-50 rounded max-h-64 overflow-auto">
            {dataFetcherTool.renderer({ data: fetcher.data, loading: fetcher.loading, error: fetcher.error || undefined })}
          </div>
        )}
      </section>

      {/* Code Example */}
      <section className="border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Code Example</h2>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto text-sm">
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
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)`}
        </pre>
      </section>
    </div>
  );
}