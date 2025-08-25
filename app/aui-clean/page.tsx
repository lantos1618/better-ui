'use client';

import React, { useState } from 'react';
import aui from '@/lib/aui';
import { z } from 'zod';

// Simple tool - just 2 methods
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: Math.floor(Math.random() * 30) + 50, 
    city: input.city,
    conditions: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)]
  }))
  .render(({ data }) => (
    <div className="p-4 bg-blue-100 rounded-lg">
      <h3 className="font-bold">{data.city}</h3>
      <p>{data.temp}°F - {data.conditions}</p>
    </div>
  ));

// Complex tool - adds client optimization
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side: database search
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate DB
    return {
      results: [
        { id: 1, title: `Result for "${input.query}" #1`, score: 0.95 },
        { id: 2, title: `Result for "${input.query}" #2`, score: 0.87 },
        { id: 3, title: `Result for "${input.query}" #3`, score: 0.72 },
      ]
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: check cache first, then fetch
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached) {
      console.log('Using cached results for:', input.query);
      return cached;
    }
    
    const response = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    const data = await response.json();
    ctx.cache.set(cacheKey, data);
    return data;
  })
  .render(({ data }) => (
    <div className="space-y-2">
      {data.results.map((result: any) => (
        <div key={result.id} className="p-3 bg-gray-50 rounded border">
          <div className="font-medium">{result.title}</div>
          <div className="text-sm text-gray-500">Score: {result.score}</div>
        </div>
      ))}
    </div>
  ));

// UI state management tool
const stateTool = aui
  .tool('state')
  .input(z.object({ 
    action: z.enum(['set', 'get', 'clear']),
    key: z.string().optional(),
    value: z.any().optional()
  }))
  .clientExecute(async ({ input, ctx }) => {
    const storage = ctx.cache;
    
    switch (input.action) {
      case 'set':
        if (input.key && input.value !== undefined) {
          storage.set(input.key, input.value);
          return { success: true, value: input.value };
        }
        return { success: false, error: 'Missing key or value' };
      
      case 'get':
        if (input.key) {
          return { success: true, value: storage.get(input.key) };
        }
        return { success: false, error: 'Missing key' };
      
      case 'clear':
        storage.clear();
        return { success: true };
      
      default:
        return { success: false, error: 'Invalid action' };
    }
  })
  .render(({ data }) => (
    <div className="p-2 text-sm font-mono bg-gray-100 rounded">
      {JSON.stringify(data, null, 2)}
    </div>
  ));

// Form handling tool
const formTool = aui
  .tool('form')
  .input(z.object({
    name: z.string().min(1),
    email: z.string().email(),
    message: z.string().min(10)
  }))
  .execute(async ({ input }) => {
    // Server-side: save to database
    console.log('Saving form data:', input);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      success: true,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString()
    };
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div>Submitting...</div>;
    if (error) return <div className="text-red-600">Error: {error.message}</div>;
    if (data?.success) {
      return (
        <div className="p-4 bg-green-100 rounded-lg">
          <p className="font-bold text-green-800">Form submitted successfully!</p>
          <p className="text-sm">ID: {data.id}</p>
          <p className="text-sm">Time: {data.timestamp}</p>
        </div>
      );
    }
    return <div></div>;
  });

export default function AUICleanDemo() {
  const [weatherCity, setWeatherCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [weatherResult, setWeatherResult] = useState<any>(null);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [stateResult, setStateResult] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [formResult, setFormResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

  const executeWeather = async () => {
    if (!weatherCity) return;
    setIsLoading(prev => ({ ...prev, weather: true }));
    try {
      const result = await weatherTool.run({ city: weatherCity });
      setWeatherResult(result);
    } finally {
      setIsLoading(prev => ({ ...prev, weather: false }));
    }
  };

  const executeSearch = async () => {
    if (!searchQuery) return;
    setIsLoading(prev => ({ ...prev, search: true }));
    try {
      const result = await searchTool.run({ query: searchQuery });
      setSearchResult(result);
    } finally {
      setIsLoading(prev => ({ ...prev, search: false }));
    }
  };

  const executeState = async (action: 'set' | 'get' | 'clear') => {
    const result = await stateTool.run({
      action,
      key: 'demo-key',
      value: action === 'set' ? { timestamp: Date.now() } : undefined
    });
    setStateResult(result);
  };

  const submitForm = async () => {
    setIsLoading(prev => ({ ...prev, form: true }));
    try {
      const result = await formTool.run(formData);
      setFormResult(result);
    } catch (error: any) {
      setFormResult({ error: error.message });
    } finally {
      setIsLoading(prev => ({ ...prev, form: false }));
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">AUI Clean Demo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Weather Tool Demo */}
        <div className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Weather Tool (Simple)</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Enter city name"
              value={weatherCity}
              onChange={(e) => setWeatherCity(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
            <button
              onClick={executeWeather}
              disabled={isLoading.weather}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isLoading.weather ? 'Loading...' : 'Get Weather'}
            </button>
            {weatherResult && weatherTool.renderer && 
              weatherTool.renderer({ data: weatherResult, loading: false })
            }
          </div>
        </div>

        {/* Search Tool Demo */}
        <div className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Search Tool (Complex)</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Search query"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
            <button
              onClick={executeSearch}
              disabled={isLoading.search}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {isLoading.search ? 'Searching...' : 'Search'}
            </button>
            {searchResult && searchTool.renderer && 
              searchTool.renderer({ data: searchResult, loading: false })
            }
          </div>
        </div>

        {/* State Tool Demo */}
        <div className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">State Management Tool</h2>
          <div className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => executeState('set')}
                className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Set State
              </button>
              <button
                onClick={() => executeState('get')}
                className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Get State
              </button>
              <button
                onClick={() => executeState('clear')}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Clear State
              </button>
            </div>
            {stateResult && stateTool.renderer && 
              stateTool.renderer({ data: stateResult, loading: false })
            }
          </div>
        </div>

        {/* Form Tool Demo */}
        <div className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Form Tool</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
            />
            <textarea
              placeholder="Message (min 10 chars)"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
              rows={3}
            />
            <button
              onClick={submitForm}
              disabled={isLoading.form}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
            >
              {isLoading.form ? 'Submitting...' : 'Submit Form'}
            </button>
            {formResult && formTool.renderer && 
              formTool.renderer({ 
                data: formResult, 
                loading: isLoading.form,
                error: formResult.error ? new Error(formResult.error) : undefined
              })
            }
          </div>
        </div>
      </div>

      {/* Code Example */}
      <div className="mt-12 border rounded-lg p-6 bg-gray-50">
        <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
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
      </div>
    </div>
  );
}