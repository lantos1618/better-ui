'use client';

import React, { useState } from 'react';
import { weatherTool, searchTool, calculatorTool } from '@/lib/aui/examples';
import { ToolRenderer, useAUITool } from '@/lib/aui/components/ToolRenderer';
import aui from '@/lib/aui';

export default function AUIDemoPage() {
  const [city, setCity] = useState('San Francisco');
  const [searchQuery, setSearchQuery] = useState('Next.js');
  const [calcInput, setCalcInput] = useState({ a: 10, b: 5, op: '+' as const });

  // Using the hook approach
  const weather = useAUITool(weatherTool, aui.createContext());
  const search = useAUITool(searchTool, aui.createContext());

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
          <p className="text-gray-600 mb-4">Simple calculation tool with automatic rendering</p>
          
          <div className="flex gap-2 mb-4">
            <input
              type="number"
              value={calcInput.a}
              onChange={(e) => setCalcInput(prev => ({ ...prev, a: Number(e.target.value) }))}
              className="px-3 py-2 border rounded-lg w-24"
            />
            <select
              value={calcInput.op}
              onChange={(e) => setCalcInput(prev => ({ ...prev, op: e.target.value as any }))}
              className="px-3 py-2 border rounded-lg"
            >
              <option value="+">+</option>
              <option value="-">-</option>
              <option value="*">×</option>
              <option value="/">÷</option>
            </select>
            <input
              type="number"
              value={calcInput.b}
              onChange={(e) => setCalcInput(prev => ({ ...prev, b: Number(e.target.value) }))}
              className="px-3 py-2 border rounded-lg w-24"
            />
          </div>
          
          <ToolRenderer
            tool={calculatorTool}
            input={calcInput}
            context={aui.createContext()}
            autoExecute={true}
          />
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