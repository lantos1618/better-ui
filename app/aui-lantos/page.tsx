'use client';

import React, { useState } from 'react';
import aui, { z } from '@/lib/aui';
import { ClientToolExecutor } from '@/lib/aui/client/executor';

// Initialize client executor
const executor = new ClientToolExecutor({
  apiUrl: '/api/aui',
});

// ============================================================================
// DEFINE TOOLS - Exact API as requested
// ============================================================================

// Simple tool - just 2 methods
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }: any) => ({ temp: 72, city: input.city }))
  .render(({ data }: any) => <div>{data.city}: {data.temp}°</div>)
  .build();

// Complex tool - adds client optimization
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }: any) => {
    // Server-side database search simulation
    return [
      { id: 1, title: `Server result for "${input.query}"`, score: 0.95 },
      { id: 2, title: `Another match for "${input.query}"`, score: 0.87 }
    ];
  })
  .clientExecute(async ({ input, ctx }: any) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    if (cached) {
      console.log('Using cached result for:', input.query);
      return cached;
    }
    
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: input.query })
    }).then((r: any) => r.json());
    
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }: any) => (
    <div className="space-y-2">
      {Array.isArray(data) ? data.map((item: any) => (
        <div key={item.id} className="p-3 bg-gray-50 rounded">
          <h4 className="font-semibold">{item.title}</h4>
          {item.score && <span className="text-sm text-gray-600">Score: {item.score}</span>}
        </div>
      )) : (
        <div className="p-3 bg-gray-50 rounded">
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </div>
  ))
  .build();

// Register tools
aui.register(weatherTool);
aui.register(searchTool);

export default function AUILantosPage() {
  const [activeTab, setActiveTab] = useState<'simple' | 'complex' | 'ai'>('simple');
  const [weatherCity, setWeatherCity] = useState('San Francisco');
  const [searchQuery, setSearchQuery] = useState('AUI framework');
  const [weatherResult, setWeatherResult] = useState<any>(null);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const executeWeather = async () => {
    setIsExecuting(true);
    try {
      const result = await executor.execute({
        id: `weather-${Date.now()}`,
        toolName: 'weather',
        input: { city: weatherCity }
      });
      setWeatherResult(result);
    } finally {
      setIsExecuting(false);
    }
  };

  const executeSearch = async () => {
    setIsExecuting(true);
    try {
      const result = await executor.execute({
        id: `search-${Date.now()}`,
        toolName: 'search',
        input: { query: searchQuery }
      });
      setSearchResult(result);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AUI (Assistant-UI)
          </h1>
          <p className="text-gray-600 mt-2">
            Ultra-concise API for AI to control frontend and backend in Next.js/Vercel
          </p>
          <div className="mt-4 text-sm text-gray-500">
            Branch: lantos-aui
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-lg shadow-sm p-1 inline-flex">
            <button
              onClick={() => setActiveTab('simple')}
              className={`px-4 py-2 rounded-md transition ${
                activeTab === 'simple' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Simple Tool
            </button>
            <button
              onClick={() => setActiveTab('complex')}
              className={`px-4 py-2 rounded-md transition ${
                activeTab === 'complex' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Complex Tool
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-4 py-2 rounded-md transition ${
                activeTab === 'ai' 
                  ? 'bg-blue-500 text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              AI Control
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Code Example */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Code Example</h2>
            
            {activeTab === 'simple' && (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                <code>{`// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: 72, 
    city: input.city 
  }))
  .render(({ data }) => (
    <div>{data.city}: {data.temp}°</div>
  ))
  .build();`}</code>
              </pre>
            )}

            {activeTab === 'complex' && (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                <code>{`// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => 
    db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { 
      body: input 
    });
  })
  .render(({ data }) => 
    <SearchResults results={data} />)
  .build();`}</code>
              </pre>
            )}

            {activeTab === 'ai' && (
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
                <code>{`// AI can control both frontend and backend
const aiTool = aui
  .tool('ai-control')
  .input(z.object({ 
    action: z.enum(['frontend', 'backend']),
    command: z.string() 
  }))
  .execute(async ({ input }) => {
    // Backend operations
    if (input.action === 'backend') {
      return await db.execute(input.command);
    }
  })
  .clientExecute(async ({ input, ctx }) => {
    // Frontend operations
    if (input.action === 'frontend') {
      return ctx.updateUI(input.command);
    }
  })
  .render(({ data }) => 
    <AIResponse data={data} />)
  .build();`}</code>
              </pre>
            )}
          </div>

          {/* Interactive Demo */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Interactive Demo</h2>
            
            {activeTab === 'simple' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City Name
                  </label>
                  <input
                    type="text"
                    value={weatherCity}
                    onChange={(e) => setWeatherCity(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter city name"
                  />
                </div>
                
                <button
                  onClick={executeWeather}
                  disabled={isExecuting}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExecuting ? 'Executing...' : 'Get Weather'}
                </button>
                
                {weatherResult && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-2">Result:</h3>
                    {weatherResult.error ? (
                      <div className="text-red-600">Error: {weatherResult.error}</div>
                    ) : (
                      weatherTool.render && weatherTool.render({ 
                        data: weatherResult.output, 
                        input: { city: weatherCity } 
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'complex' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search Query
                  </label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter search query"
                  />
                </div>
                
                <button
                  onClick={executeSearch}
                  disabled={isExecuting}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExecuting ? 'Searching...' : 'Search'}
                </button>
                
                {searchResult && (
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Results:</h3>
                    {searchResult.error ? (
                      <div className="text-red-600">Error: {searchResult.error}</div>
                    ) : (
                      searchTool.render && searchTool.render({ 
                        data: searchResult.output, 
                        input: { query: searchQuery } 
                      })
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">AI Control Features</h3>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li>✓ Frontend UI manipulation</li>
                    <li>✓ Backend database operations</li>
                    <li>✓ Real-time state management</li>
                    <li>✓ API orchestration</li>
                    <li>✓ Caching & optimization</li>
                    <li>✓ Type-safe tool definitions</li>
                  </ul>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">
                    The AI can use these tools to control both the frontend and backend,
                    enabling sophisticated interactions and automations in your Next.js application.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl mb-2">🚀</div>
            <h3 className="font-semibold mb-2">Ultra-Concise API</h3>
            <p className="text-sm text-gray-600">
              Define tools with just 2-4 method calls. Simple tools need only execute() and render().
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl mb-2">🤖</div>
            <h3 className="font-semibold mb-2">AI-Optimized</h3>
            <p className="text-sm text-gray-600">
              Built for AI tool calls with automatic retries, caching, and error handling.
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-semibold mb-2">Full-Stack Control</h3>
            <p className="text-sm text-gray-600">
              AI can control both frontend UI and backend operations seamlessly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}