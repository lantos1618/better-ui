'use client';

import { useState } from 'react';
import { weatherTool, searchTool, calculatorTool, userProfileTool } from '@/lib/aui/tools/examples';
import aui from '@/lib/aui';

export default function AUIExamplesPage() {
  const [weatherCity, setWeatherCity] = useState('San Francisco');
  const [searchQuery, setSearchQuery] = useState('');
  const [calcA, setCalcA] = useState(10);
  const [calcB, setCalcB] = useState(5);
  const [calcOp, setCalcOp] = useState<'add' | 'subtract' | 'multiply' | 'divide'>('add');
  const [userId, setUserId] = useState('123');
  
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const runTool = async (toolName: string, input: any) => {
    setLoading(prev => ({ ...prev, [toolName]: true }));
    try {
      const ctx = aui.createContext();
      const result = await aui.execute(toolName, input, ctx);
      setResults(prev => ({ ...prev, [toolName]: result }));
    } catch (error) {
      console.error(`Error running ${toolName}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setResults(prev => ({ ...prev, [toolName]: { error: errorMessage } }));
    } finally {
      setLoading(prev => ({ ...prev, [toolName]: false }));
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-8">AUI Tool Examples</h1>
      
      {/* Weather Tool */}
      <section className="border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Weather Tool (Simple)</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={weatherCity}
            onChange={(e) => setWeatherCity(e.target.value)}
            placeholder="Enter city"
            className="px-3 py-2 border rounded"
          />
          <button
            onClick={() => runTool('weather', { city: weatherCity })}
            disabled={loading.weather}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading.weather ? 'Loading...' : 'Get Weather'}
          </button>
        </div>
        {results.weather && (
          <div className="p-4 bg-gray-50 rounded">
            {weatherTool.renderer && weatherTool.renderer({ data: results.weather })}
          </div>
        )}
      </section>

      {/* Search Tool */}
      <section className="border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Search Tool (Complex with Client Caching)</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search query"
            className="px-3 py-2 border rounded flex-1"
          />
          <button
            onClick={() => runTool('search', { query: searchQuery })}
            disabled={loading.search || !searchQuery}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading.search ? 'Searching...' : 'Search'}
          </button>
        </div>
        {results.search && (
          <div className="p-4 bg-gray-50 rounded">
            {searchTool.renderer && searchTool.renderer({ data: results.search })}
          </div>
        )}
      </section>

      {/* Calculator Tool */}
      <section className="border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">Calculator Tool</h2>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={calcA}
            onChange={(e) => setCalcA(Number(e.target.value))}
            className="px-3 py-2 border rounded w-24"
          />
          <select
            value={calcOp}
            onChange={(e) => setCalcOp(e.target.value as any)}
            className="px-3 py-2 border rounded"
          >
            <option value="add">+</option>
            <option value="subtract">-</option>
            <option value="multiply">×</option>
            <option value="divide">÷</option>
          </select>
          <input
            type="number"
            value={calcB}
            onChange={(e) => setCalcB(Number(e.target.value))}
            className="px-3 py-2 border rounded w-24"
          />
          <button
            onClick={() => runTool('calculator', { a: calcA, b: calcB, operation: calcOp })}
            disabled={loading.calculator}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
          >
            {loading.calculator ? 'Calculating...' : 'Calculate'}
          </button>
        </div>
        {results.calculator && (
          <div>
            {calculatorTool.renderer && calculatorTool.renderer({ data: results.calculator })}
          </div>
        )}
      </section>

      {/* User Profile Tool */}
      <section className="border rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold">User Profile Tool (with Client Caching)</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID"
            className="px-3 py-2 border rounded"
          />
          <button
            onClick={() => runTool('userProfile', { userId })}
            disabled={loading.userProfile}
            className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
          >
            {loading.userProfile ? 'Loading...' : 'Get Profile'}
          </button>
        </div>
        {results.userProfile && (
          <div>
            {userProfileTool.renderer && userProfileTool.renderer({ 
              data: results.userProfile,
              loading: loading.userProfile 
            })}
          </div>
        )}
      </section>

      {/* Code Example */}
      <section className="border rounded-lg p-6 space-y-4 bg-gray-900 text-gray-100">
        <h2 className="text-xl font-semibold">Code Example</h2>
        <pre className="text-sm overflow-x-auto">
          <code>{`// Simple tool - just 2 methods
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
  .render(({ data }) => <SearchResults results={data} />)`}</code>
        </pre>
      </section>
    </div>
  );
}