'use client';

import React, { useState } from 'react';
import aui from '@/lib/aui';
import { z } from 'zod';

// Simple tool - just 2 methods
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city, condition: 'sunny' }))
  .render(({ data }) => (
    <div className="p-4 bg-blue-50 rounded-lg">
      <h3 className="font-bold text-lg">{data.city}</h3>
      <p className="text-2xl">{data.temp}°F</p>
      <p className="text-gray-600">{data.condition}</p>
    </div>
  ));

// Complex tool - adds client optimization
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulated database search
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
      { id: 1, title: `Result for "${input.query}" - Item 1`, score: 0.95 },
      { id: 2, title: `Result for "${input.query}" - Item 2`, score: 0.87 },
      { id: 3, title: `Result for "${input.query}" - Item 3`, score: 0.72 },
    ];
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    if (cached) {
      console.log('Using cached results for:', input.query);
      return cached;
    }
    
    // In real app, this would call the API
    const response = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: input.query })
    });
    const results = await response.json();
    ctx.cache.set(cacheKey, results);
    return results;
  })
  .render(({ data, input }) => (
    <div className="space-y-2">
      <h3 className="font-semibold text-gray-700">
        Search results for &quot;{input?.query}&quot;:
      </h3>
      {data.map((item: any) => (
        <div key={item.id} className="p-3 bg-white border rounded-lg hover:shadow-md transition-shadow">
          <div className="font-medium">{item.title}</div>
          <div className="text-sm text-gray-500">Score: {item.score}</div>
        </div>
      ))}
    </div>
  ));

// Form tool - AI can fill forms
const formTool = aui
  .tool('form')
  .input(z.object({
    name: z.string(),
    email: z.string().email(),
    message: z.string()
  }))
  .execute(async ({ input }) => {
    // Process form submission
    console.log('Form submitted:', input);
    return { 
      success: true, 
      message: `Thank you ${input.name}, we received your message!` 
    };
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div className="text-gray-500">Submitting...</div>;
    if (error) return <div className="text-red-500">Error: {error.message}</div>;
    if (!data) return <div></div>;
    
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-green-800">{data.message}</p>
      </div>
    );
  });

// Database tool - AI can query data
const databaseTool = aui
  .tool('database')
  .input(z.object({
    table: z.string(),
    operation: z.enum(['read', 'create', 'update', 'delete']),
    data: z.any().optional()
  }))
  .execute(async ({ input }) => {
    // Simulated database operation
    switch (input.operation) {
      case 'read':
        return { 
          rows: [
            { id: 1, name: 'John Doe', email: 'john@example.com' },
            { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
          ] 
        };
      case 'create':
        return { id: 3, ...input.data };
      default:
        return { success: true, operation: input.operation };
    }
  })
  .render(({ data }) => (
    <div className="p-4 bg-gray-50 rounded-lg">
      <pre className="text-sm">{JSON.stringify(data, null, 2)}</pre>
    </div>
  ));

export default function AUICleanDemo() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const executeTool = async (toolName: string, input: any) => {
    setLoading(prev => ({ ...prev, [toolName]: true }));
    try {
      const tool = aui.get(toolName);
      if (!tool) throw new Error(`Tool ${toolName} not found`);
      
      const result = await tool.run(input);
      setResults(prev => ({ ...prev, [toolName]: result }));
    } catch (error) {
      console.error(`Error executing ${toolName}:`, error);
      setResults(prev => ({ ...prev, [toolName]: { error: error instanceof Error ? error.message : 'Unknown error' } }));
    } finally {
      setLoading(prev => ({ ...prev, [toolName]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">AUI Clean Demo</h1>
        <p className="text-gray-600 mb-8">
          Concise API for AI-controlled tools in Next.js
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Weather Tool Demo */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Weather Tool (Simple)</h2>
            <div className="space-y-4">
              <button
                onClick={() => executeTool('weather', { city: 'San Francisco' })}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                disabled={loading.weather}
              >
                Get Weather for SF
              </button>
              {results.weather && weatherTool.renderer?.({ 
                data: results.weather,
                loading: loading.weather 
              })}
            </div>
          </div>

          {/* Search Tool Demo */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Search Tool (Complex)</h2>
            <div className="space-y-4">
              <button
                onClick={() => executeTool('search', { query: 'AI tools' })}
                className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                disabled={loading.search}
              >
                Search for &quot;AI tools&quot;
              </button>
              {results.search && searchTool.renderer?.({ 
                data: results.search,
                input: { query: 'AI tools' },
                loading: loading.search 
              })}
            </div>
          </div>

          {/* Form Tool Demo */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Form Tool</h2>
            <div className="space-y-4">
              <button
                onClick={() => executeTool('form', { 
                  name: 'AI Assistant',
                  email: 'ai@example.com',
                  message: 'Hello from AUI!'
                })}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                disabled={loading.form}
              >
                Submit Form
              </button>
              {results.form && formTool.renderer?.({ 
                data: results.form,
                loading: loading.form 
              })}
            </div>
          </div>

          {/* Database Tool Demo */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Database Tool</h2>
            <div className="space-y-4">
              <button
                onClick={() => executeTool('database', { 
                  table: 'users',
                  operation: 'read'
                })}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                disabled={loading.database}
              >
                Query Database
              </button>
              {results.database && databaseTool.renderer?.({ 
                data: results.database,
                loading: loading.database 
              })}
            </div>
          </div>
        </div>

        {/* Code Example */}
        <div className="mt-12 bg-gray-900 text-gray-100 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Example Code</h2>
          <pre className="text-sm overflow-x-auto">
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
        </div>
      </div>
    </div>
  );
}