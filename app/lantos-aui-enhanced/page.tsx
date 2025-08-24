'use client';

import { useState } from 'react';
import { weatherTool, searchTool, userTool, calculatorTool, dataFetcher } from '@/examples/aui-tools';
import aui from '@/lib/aui-enhanced';

export default function LantosAUIEnhanced() {
  const [weatherCity, setWeatherCity] = useState('New York');
  const [weatherData, setWeatherData] = useState<any>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  
  const [userId, setUserId] = useState('123');
  const [userData, setUserData] = useState<any>(null);
  
  const [calcA, setCalcA] = useState(10);
  const [calcB, setCalcB] = useState(5);
  const [calcOp, setCalcOp] = useState<'add' | 'subtract' | 'multiply' | 'divide'>('add');
  const [calcResult, setCalcResult] = useState<any>(null);

  const handleWeather = async () => {
    const result = await weatherTool.run({ city: weatherCity });
    setWeatherData(result);
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    const result = await searchTool.run({ query: searchQuery, limit: 5 });
    setSearchResults(result);
  };

  const handleUser = async () => {
    try {
      const result = await userTool.run({ userId });
      setUserData(result);
    } catch (error) {
      setUserData({ error: error.message });
    }
  };

  const handleCalculate = async () => {
    const result = await calculatorTool.run({ 
      a: calcA, 
      b: calcB, 
      operation: calcOp 
    });
    setCalcResult(result);
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-4xl font-bold mb-8">Lantos AUI (Assistant UI)</h1>
      <p className="text-gray-600 mb-8">
        Enhanced server/client tool execution with caching, retry, and error handling for Next.js Vercel
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Weather Tool */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Weather Tool</h2>
          <p className="text-sm text-gray-600">Server-side execution</p>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={weatherCity}
              onChange={(e) => setWeatherCity(e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
              placeholder="Enter city name"
            />
            <button
              onClick={handleWeather}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Get Weather
            </button>
          </div>
          
          {weatherData && weatherTool.render({ data: weatherData })}
        </div>

        {/* Search Tool */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Search Tool</h2>
          <p className="text-sm text-gray-600">Client-side with 1-minute caching</p>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
              placeholder="Search query"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Search
            </button>
          </div>
          
          {searchResults && searchTool.render({ data: searchResults, input: { query: searchQuery, limit: 5 } })}
        </div>

        {/* User Tool */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-2xl font-semibold">User Tool</h2>
          <p className="text-sm text-gray-600">With error handling (try "error")</p>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
              placeholder="User ID"
            />
            <button
              onClick={handleUser}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Get User
            </button>
          </div>
          
          {userData && userTool.render({ 
            data: userData.error ? null : userData, 
            error: userData.error ? new Error(userData.error) : undefined 
          })}
        </div>

        {/* Calculator Tool */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-2xl font-semibold">Calculator Tool</h2>
          <p className="text-sm text-gray-600">Pure client-side execution</p>
          
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="number"
                value={calcA}
                onChange={(e) => setCalcA(Number(e.target.value))}
                className="flex-1 px-3 py-2 border rounded"
                placeholder="A"
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
                className="flex-1 px-3 py-2 border rounded"
                placeholder="B"
              />
            </div>
            <button
              onClick={handleCalculate}
              className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Calculate
            </button>
          </div>
          
          {calcResult && calculatorTool.render({ data: calcResult })}
        </div>
      </div>

      {/* Key Features */}
      <div className="mt-12 grid md:grid-cols-2 gap-8">
        <div className="border rounded-lg p-6 bg-gray-50">
          <h2 className="text-2xl font-semibold mb-4">Simple Tool Pattern</h2>
          <pre className="text-sm overflow-x-auto bg-white p-4 rounded">
            <code>{`// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: 72, 
    city: input.city 
  }))
  .render(({ data }) => 
    <div>{data.city}: {data.temp}°</div>
  )`}</code>
          </pre>
        </div>

        <div className="border rounded-lg p-6 bg-gray-50">
          <h2 className="text-2xl font-semibold mb-4">Complex Tool Pattern</h2>
          <pre className="text-sm overflow-x-auto bg-white p-4 rounded">
            <code>{`// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => 
    db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', 
      { body: input });
  })
  .render(({ data }) => 
    <SearchResults results={data} />)
  .cache(60000)  // 1 minute cache
  .retry(3)      // Retry 3 times
  .timeout(5000) // 5 second timeout`}</code>
          </pre>
        </div>
      </div>

      {/* Enhanced Features */}
      <div className="mt-8 border rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Enhanced Features</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded">
            <h3 className="font-semibold mb-2">🚀 Performance</h3>
            <ul className="text-sm space-y-1">
              <li>• Smart caching with TTL</li>
              <li>• Automatic retries</li>
              <li>• Timeout handling</li>
              <li>• Batch execution</li>
            </ul>
          </div>
          
          <div className="p-4 bg-green-50 rounded">
            <h3 className="font-semibold mb-2">🔧 Developer Experience</h3>
            <ul className="text-sm space-y-1">
              <li>• Type-safe with Zod</li>
              <li>• Fluent API design</li>
              <li>• Error boundaries</li>
              <li>• Debug logging</li>
            </ul>
          </div>
          
          <div className="p-4 bg-purple-50 rounded">
            <h3 className="font-semibold mb-2">🎯 AI Integration</h3>
            <ul className="text-sm space-y-1">
              <li>• Server/client separation</li>
              <li>• Context management</li>
              <li>• Tool registry</li>
              <li>• Render components</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tool Registry */}
      <div className="mt-8 border rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Registered Tools</h2>
        <div className="flex flex-wrap gap-2">
          {aui.list().map(name => (
            <span key={name} className="px-3 py-1 bg-gray-200 rounded">
              {name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}