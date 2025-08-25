'use client';

import React, { useState } from 'react';
import aui from '@/lib/aui';
import { z } from 'zod';

// Simple tool - just 2 methods (exactly as requested)
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization (exactly as requested)
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulate database search
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      results: [
        { id: 1, title: `Result for "${input.query}"`, score: 0.95 },
        { id: 2, title: `Another match for "${input.query}"`, score: 0.85 },
        { id: 3, title: `Related to "${input.query}"`, score: 0.75 }
      ]
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const response = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    const data = await response.json();
    ctx.cache.set(input.query, data);
    return data;
  })
  .render(({ data }) => (
    <div className="space-y-2">
      {data.results.map((result: any) => (
        <div key={result.id} className="p-2 bg-gray-100 rounded">
          <div className="font-semibold">{result.title}</div>
          <div className="text-sm text-gray-600">Score: {result.score}</div>
        </div>
      ))}
    </div>
  ));

// AI Control Tools for Frontend and Backend
const domControlTool = aui
  .tool('dom-control')
  .input(z.object({
    selector: z.string(),
    action: z.enum(['click', 'type', 'focus', 'scroll']),
    value: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    const element = document.querySelector(input.selector) as HTMLElement;
    if (!element) throw new Error(`Element not found: ${input.selector}`);
    
    switch (input.action) {
      case 'click':
        element.click();
        break;
      case 'type':
        if (element instanceof HTMLInputElement) {
          element.value = input.value || '';
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
        break;
      case 'focus':
        element.focus();
        break;
      case 'scroll':
        element.scrollIntoView({ behavior: 'smooth' });
        break;
    }
    
    return { success: true, action: input.action, selector: input.selector };
  })
  .render(({ data }) => (
    <span className="text-green-600">✓ {data.action} on {data.selector}</span>
  ));

const apiControlTool = aui
  .tool('api-control')
  .input(z.object({
    endpoint: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    body: z.any().optional()
  }))
  .execute(async ({ input }) => {
    // This runs on the server
    const response = await fetch(input.endpoint, {
      method: input.method,
      headers: { 'Content-Type': 'application/json' },
      body: input.body ? JSON.stringify(input.body) : undefined
    });
    return { status: response.status, data: await response.json() };
  })
  .render(({ data }) => (
    <div className="font-mono text-sm">
      Status: {data.status}
      <pre className="bg-gray-900 text-green-400 p-2 rounded mt-1">
        {JSON.stringify(data.data, null, 2)}
      </pre>
    </div>
  ));

export default function AUIDemo() {
  const [weatherCity, setWeatherCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [weatherResult, setWeatherResult] = useState<any>(null);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [domResult, setDomResult] = useState<any>(null);

  const handleWeather = async () => {
    if (!weatherCity) return;
    const result = await simpleTool.run({ city: weatherCity });
    setWeatherResult(result);
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    const result = await complexTool.run({ query: searchQuery });
    setSearchResult(result);
  };

  const handleDomControl = async () => {
    try {
      const result = await domControlTool.run({
        selector: '#search-input',
        action: 'type',
        value: 'AI controlled input!'
      });
      setDomResult(result);
    } catch (error) {
      console.error('DOM control error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            AUI (Assistant-UI) System
          </h1>
          <p className="text-xl text-gray-600">
            Concise API for AI-controlled frontend and backend operations in Next.js
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Simple Tool Demo */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Simple Tool</h2>
            <div className="bg-gray-50 p-4 rounded mb-4">
              <pre className="text-sm overflow-x-auto">{`const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)`}</pre>
            </div>
            
            <div className="space-y-4">
              <input
                id="weather-input"
                type="text"
                placeholder="Enter city name"
                value={weatherCity}
                onChange={(e) => setWeatherCity(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <button
                onClick={handleWeather}
                className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600"
              >
                Get Weather
              </button>
              {weatherResult && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  {simpleTool.renderer && simpleTool.renderer({ data: weatherResult })}
                </div>
              )}
            </div>
          </div>

          {/* Complex Tool Demo */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Complex Tool with Client Optimization</h2>
            <div className="bg-gray-50 p-4 rounded mb-4">
              <pre className="text-sm overflow-x-auto">{`const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)`}</pre>
            </div>
            
            <div className="space-y-4">
              <input
                id="search-input"
                type="text"
                placeholder="Search query"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <button
                onClick={handleSearch}
                className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
              >
                Search
              </button>
              {searchResult && (
                <div className="p-4 bg-green-50 rounded-lg">
                  {complexTool.renderer && complexTool.renderer({ data: searchResult })}
                </div>
              )}
            </div>
          </div>

          {/* AI Control Demo */}
          <div className="bg-white rounded-lg shadow-lg p-6 md:col-span-2">
            <h2 className="text-2xl font-bold mb-4">AI Frontend/Backend Control</h2>
            <p className="text-gray-600 mb-4">
              Tools that enable AI agents to control both frontend DOM and backend APIs
            </p>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold mb-2">Frontend Control</h3>
                <button
                  onClick={handleDomControl}
                  className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
                >
                  AI Control DOM
                </button>
                {domResult && (
                  <div className="mt-4">
                    {domControlTool.renderer && domControlTool.renderer({ data: domResult })}
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-semibold mb-2">Backend Control</h3>
                <p className="text-sm text-gray-600">
                  AI can execute API calls, database queries, and server operations
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold mb-6">Key Features</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">🎯 Concise API</h3>
              <p className="text-gray-600">
                Chain methods directly without .build() - tools are ready to use immediately
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">🤖 AI Control</h3>
              <p className="text-gray-600">
                Enable AI agents to control frontend DOM and backend operations seamlessly
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">⚡ Client Optimization</h3>
              <p className="text-gray-600">
                Optional client-side execution with caching, offline support, and more
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">🔧 Type Safety</h3>
              <p className="text-gray-600">
                Full TypeScript support with Zod schema validation
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">🚀 Next.js Ready</h3>
              <p className="text-gray-600">
                Built for Next.js with server/client execution modes
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">📦 Zero Config</h3>
              <p className="text-gray-600">
                Works out of the box with sensible defaults
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}