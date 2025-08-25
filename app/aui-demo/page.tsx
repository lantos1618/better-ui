'use client';

import React, { useState } from 'react';
import { weatherTool, searchTool, calculatorTool, chartTool } from '@/lib/aui/tools.tsx';
import { useAUITool } from '@/lib/aui/hooks/useAUITool';
import { AUIProvider } from '@/lib/aui/provider';
import aui from '@/lib/aui';

function AUIDemoContent() {
  const [city, setCity] = useState('San Francisco');
  const [searchQuery, setSearchQuery] = useState('Next.js');
  const [expression, setExpression] = useState('10 + 5 * 2');

  // Using the hook approach
  const weather = useAUITool(weatherTool);
  const search = useAUITool(searchTool);
  const calculator = useAUITool(calculatorTool);

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">AUI (Assistant-UI) Demo</h1>
      
      <div className="space-y-8">
        {/* Weather Tool Demo */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Weather Tool</h2>
          <p className="text-gray-600 mb-4">Simple tool with execute and render methods</p>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="px-3 py-2 border rounded-lg flex-1"
              placeholder="Enter city name"
            />
            <button
              onClick={() => weather.execute({ city })}
              disabled={weather.loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {weather.loading ? 'Loading...' : 'Get Weather'}
            </button>
          </div>
          
          {weather.data && weatherTool.renderer && (
            weatherTool.renderer({ 
              data: weather.data, 
              input: { city }, 
              loading: weather.loading 
            })
          )}
        </section>

        {/* Search Tool Demo */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Search Tool</h2>
          <p className="text-gray-600 mb-4">Complex tool with client-side caching and optimization</p>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 border rounded-lg flex-1"
              placeholder="Search query"
            />
            <button
              onClick={() => search.execute({ query: searchQuery })}
              disabled={search.loading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {search.loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          
          {(search.data || search.loading) && searchTool.renderer && (
            searchTool.renderer({ 
              data: search.data!, 
              input: { query: searchQuery }, 
              loading: search.loading,
              error: search.error || undefined
            })
          )}
        </section>

        {/* Calculator Tool Demo */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Calculator Tool</h2>
          <p className="text-gray-600 mb-4">Expression-based calculator with safe evaluation</p>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={expression}
              onChange={(e) => setExpression(e.target.value)}
              className="px-3 py-2 border rounded-lg flex-1 font-mono"
              placeholder="Enter math expression"
            />
            <button
              onClick={() => calculator.execute({ expression, precision: 2 })}
              disabled={calculator.loading}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
            >
              {calculator.loading ? 'Calculating...' : 'Calculate'}
            </button>
          </div>
          
          {(calculator.data || calculator.error) && calculatorTool.renderer && (
            calculatorTool.renderer({ 
              data: calculator.data!, 
              input: { expression, precision: 2 }, 
              loading: calculator.loading,
              error: calculator.error || undefined
            })
          )}
        </section>

        {/* Code Examples */}
        <section className="border rounded-lg p-6 bg-gray-50">
          <h2 className="text-xl font-semibold mb-4">Code Examples</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Simple Tool (2 methods)</h3>
              <pre className="p-3 bg-gray-900 text-green-400 rounded-lg overflow-x-auto text-sm">
{`const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)`}
              </pre>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Complex Tool (with client optimization)</h3>
              <pre className="p-3 bg-gray-900 text-green-400 rounded-lg overflow-x-auto text-sm">
{`const complexTool = aui
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
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function AUIDemoPage() {
  return (
    <AUIProvider>
      <AUIDemoContent />
    </AUIProvider>
  );
}