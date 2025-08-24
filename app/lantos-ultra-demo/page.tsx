'use client';

import React, { useState, useEffect } from 'react';
import aui, { z } from '@/lib/aui/lantos-ultra';

// Simple tool - just 2 methods
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city, condition: 'sunny' }))
  .render(({ data }) => (
    <div className="p-4 bg-blue-100 rounded">
      <h3 className="font-bold">{data.city}</h3>
      <p>{data.temp}°F - {data.condition}</p>
    </div>
  ));

// Complex tool - adds client optimization
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulate database search
    await new Promise(r => setTimeout(r, 500));
    return {
      results: [
        { id: 1, title: `Result for "${input.query}" #1`, score: 0.95 },
        { id: 2, title: `Result for "${input.query}" #2`, score: 0.87 },
        { id: 3, title: `Result for "${input.query}" #3`, score: 0.72 },
      ]
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    const cached = ctx.cache.get(input.query);
    if (cached) {
      console.log('Cache hit for:', input.query);
      return cached;
    }
    
    // Simulate client-side execution
    const result = {
      results: [
        { id: 0, title: `Client result for "${input.query}"`, score: 1.0 }
      ]
    };
    
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <div className="space-y-2">
      {data.results.map((r: any) => (
        <div key={r.id} className="p-3 bg-gray-100 rounded">
          <div className="font-medium">{r.title}</div>
          <div className="text-sm text-gray-600">Score: {r.score}</div>
        </div>
      ))}
    </div>
  ));

// Calculator tool - pure computation
const calcTool = aui
  .tool('calculator')
  .input(z.object({ 
    a: z.number(), 
    b: z.number(), 
    op: z.enum(['add', 'subtract', 'multiply', 'divide']) 
  }))
  .execute(({ input }) => {
    const ops = {
      add: (a: number, b: number) => a + b,
      subtract: (a: number, b: number) => a - b,
      multiply: (a: number, b: number) => a * b,
      divide: (a: number, b: number) => b !== 0 ? a / b : NaN,
    };
    return { result: ops[input.op](input.a, input.b), expression: `${input.a} ${input.op} ${input.b}` };
  })
  .render(({ data }) => (
    <div className="p-4 bg-green-100 rounded font-mono">
      {data.expression} = {data.result}
    </div>
  ));

// User profile tool with async data fetching
const profileTool = aui
  .tool('profile')
  .input(z.object({ userId: z.string() }))
  .execute(async ({ input }) => {
    // Simulate API call
    await new Promise(r => setTimeout(r, 300));
    return {
      id: input.userId,
      name: `User ${input.userId}`,
      email: `user${input.userId}@example.com`,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${input.userId}`,
      joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    };
  })
  .render(({ data }) => (
    <div className="flex items-center space-x-4 p-4 bg-purple-100 rounded">
      <img src={data.avatar} alt={data.name} className="w-16 h-16 rounded-full" />
      <div>
        <h3 className="font-bold">{data.name}</h3>
        <p className="text-sm text-gray-600">{data.email}</p>
        <p className="text-xs text-gray-500">Joined: {new Date(data.joinDate).toLocaleDateString()}</p>
      </div>
    </div>
  ));

export default function LantosUltraDemo() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const executeTool = async (toolName: string, input: any) => {
    setLoading(prev => ({ ...prev, [toolName]: true }));
    setErrors(prev => ({ ...prev, [toolName]: '' }));
    
    try {
      const ctx = aui.createContext();
      const result = await aui.execute(toolName, input, ctx);
      setResults(prev => ({ ...prev, [toolName]: result }));
    } catch (error: any) {
      setErrors(prev => ({ ...prev, [toolName]: error.message }));
    } finally {
      setLoading(prev => ({ ...prev, [toolName]: false }));
    }
  };

  // Demo executions
  useEffect(() => {
    // Execute some tools on mount
    executeTool('weather', { city: 'San Francisco' });
    executeTool('calculator', { a: 42, b: 8, op: 'multiply' });
    executeTool('profile', { userId: '123' });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Lantos AUI - Ultra Concise API</h1>
        <p className="text-gray-600 mb-8">AI-controlled frontend and backend operations in Next.js</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Simple Weather Tool */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Simple Tool: Weather</h2>
            <pre className="text-xs bg-gray-100 p-2 rounded mb-4 overflow-x-auto">
{`const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: 72, 
    city: input.city 
  }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)`}
            </pre>
            
            <div className="space-y-2">
              <button
                onClick={() => executeTool('weather', { city: 'New York' })}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                disabled={loading.weather}
              >
                Get NYC Weather
              </button>
              
              {loading.weather && <p className="text-gray-500">Loading...</p>}
              {errors.weather && <p className="text-red-500">{errors.weather}</p>}
              {results.weather && !loading.weather && weatherTool.renderer && 
                weatherTool.renderer({ data: results.weather })}
            </div>
          </div>

          {/* Complex Search Tool */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Complex Tool: Search</h2>
            <pre className="text-xs bg-gray-100 p-2 rounded mb-4 overflow-x-auto">
{`const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)`}
            </pre>
            
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search query..."
                className="w-full px-3 py-1 border rounded"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value) {
                    executeTool('search', { query: e.currentTarget.value });
                  }
                }}
              />
              
              {loading.search && <p className="text-gray-500">Searching...</p>}
              {errors.search && <p className="text-red-500">{errors.search}</p>}
              {results.search && !loading.search && searchTool.renderer && 
                searchTool.renderer({ data: results.search })}
            </div>
          </div>

          {/* Calculator Tool */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Calculator Tool</h2>
            
            <div className="space-y-2">
              <div className="flex space-x-2">
                <button
                  onClick={() => executeTool('calculator', { a: 10, b: 5, op: 'add' })}
                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  10 + 5
                </button>
                <button
                  onClick={() => executeTool('calculator', { a: 20, b: 4, op: 'divide' })}
                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  20 ÷ 4
                </button>
              </div>
              
              {loading.calculator && <p className="text-gray-500">Calculating...</p>}
              {errors.calculator && <p className="text-red-500">{errors.calculator}</p>}
              {results.calculator && !loading.calculator && calcTool.renderer && 
                calcTool.renderer({ data: results.calculator })}
            </div>
          </div>

          {/* User Profile Tool */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">User Profile Tool</h2>
            
            <div className="space-y-2">
              <div className="flex space-x-2">
                <button
                  onClick={() => executeTool('profile', { userId: '456' })}
                  className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                  Load User 456
                </button>
                <button
                  onClick={() => executeTool('profile', { userId: '789' })}
                  className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                  Load User 789
                </button>
              </div>
              
              {loading.profile && <p className="text-gray-500">Loading profile...</p>}
              {errors.profile && <p className="text-red-500">{errors.profile}</p>}
              {results.profile && !loading.profile && profileTool.renderer && 
                profileTool.renderer({ data: results.profile })}
            </div>
          </div>
        </div>

        {/* Tool Registry Info */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Registered Tools</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {aui.list().map(tool => (
              <div key={tool.name} className="p-3 bg-gray-100 rounded">
                <div className="font-medium">{tool.name}</div>
                <div className="text-xs text-gray-600">
                  {tool.schema ? 'Has input schema' : 'No schema'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Features */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Key Features</h2>
          <ul className="space-y-2 text-gray-700">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <div>
                <strong>Ultra-concise API:</strong> Chain methods without .build() calls
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <div>
                <strong>Type-safe:</strong> Full TypeScript support with Zod schemas
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <div>
                <strong>Client optimization:</strong> Optional clientExecute for caching and offline support
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <div>
                <strong>AI-ready:</strong> Tools can be controlled by AI agents for automation
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <div>
                <strong>Flexible rendering:</strong> Optional render method for UI components
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}