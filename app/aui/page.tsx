'use client';

import { useState } from 'react';
import aui, { z } from '@/lib/aui';

// Simple weather tool - just 2 methods as requested
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: Math.floor(Math.random() * 30) + 60, 
    city: input.city,
    conditions: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)]
  }))
  .render(({ data }) => (
    <div className="p-4 bg-blue-50 rounded">
      <h3 className="font-bold">{data.city}</h3>
      <p>{data.temp}°F - {data.conditions}</p>
    </div>
  ));

// Complex tool with client optimization
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
        { id: 3, title: `Result for "${input.query}" #3`, score: 0.76 }
      ]
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    if (cached) {
      console.log('Cache hit for:', input.query);
      return cached;
    }
    
    const result = await ctx.fetch('/api/aui/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'search', input })
    }).then(r => r.json()).then(res => res.data);
    
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <div className="space-y-2">
      {data.results.map((r: any) => (
        <div key={r.id} className="p-3 bg-gray-50 rounded">
          <div className="font-medium">{r.title}</div>
          <div className="text-sm text-gray-500">Score: {r.score}</div>
        </div>
      ))}
    </div>
  ));

// Calculator tool
const calcTool = aui
  .tool('calculator')
  .input(z.object({ 
    a: z.number(), 
    b: z.number(), 
    op: z.enum(['+', '-', '*', '/']) 
  }))
  .execute(({ input }) => {
    const ops: Record<string, (a: number, b: number) => number> = {
      '+': (a, b) => a + b,
      '-': (a, b) => a - b,
      '*': (a, b) => a * b,
      '/': (a, b) => a / b
    };
    return { result: ops[input.op](input.a, input.b) };
  })
  .render(({ data }) => (
    <div className="text-2xl font-mono">{data.result}</div>
  ));

// User profile tool
const userTool = aui
  .tool('user')
  .input(z.object({ userId: z.string() }))
  .execute(async ({ input }) => ({
    id: input.userId,
    name: 'John Doe',
    email: 'john@example.com',
    avatar: `https://ui-avatars.com/api/?name=John+Doe`
  }))
  .render(({ data }) => (
    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={data.avatar} className="w-12 h-12 rounded-full" alt={data.name} />
      <div>
        <div className="font-medium">{data.name}</div>
        <div className="text-sm text-gray-500">{data.email}</div>
      </div>
    </div>
  ));

export default function AUIDemo() {
  const [results, setResults] = useState<Array<{
    tool: string;
    input: any;
    output: any;
    timestamp: number;
  }>>([]);

  const ctx = aui.createContext();

  const runTool = async (toolName: string, input: any) => {
    const tool = aui.get(toolName);
    if (!tool) return;

    try {
      const output = await tool.run(input, ctx);
      setResults(prev => [...prev, {
        tool: toolName,
        input,
        output,
        timestamp: Date.now()
      }]);
    } catch (error) {
      console.error('Tool execution failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">AUI (Assistant UI)</h1>
          <p className="text-gray-600">
            Concise API for AI-controlled frontend and backend operations in Next.js
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Interactive Examples */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Try the Tools</h2>
              
              <div className="space-y-4">
                <div>
                  <button
                    onClick={() => runTool('weather', { city: 'Tokyo' })}
                    className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Get Weather for Tokyo
                  </button>
                </div>
                
                <div>
                  <button
                    onClick={() => runTool('search', { query: 'Next.js tutorials' })}
                    className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Search &quot;Next.js tutorials&quot;
                  </button>
                </div>
                
                <div>
                  <button
                    onClick={() => runTool('calculator', { a: 42, b: 8, op: '*' })}
                    className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                  >
                    Calculate 42 × 8
                  </button>
                </div>
                
                <div>
                  <button
                    onClick={() => runTool('user', { userId: 'user123' })}
                    className="w-full px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                  >
                    Get User Profile
                  </button>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Results</h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {results.map((result, i) => {
                  const tool = aui.get(result.tool);
                  return (
                    <div key={i} className="border-l-4 border-blue-500 pl-4">
                      <div className="text-sm text-gray-500 mb-1">
                        {result.tool} • {new Date(result.timestamp).toLocaleTimeString()}
                      </div>
                      {tool?.renderer ? tool.renderer({ data: result.output, input: result.input }) : (
                        <pre className="text-xs">{JSON.stringify(result.output, null, 2)}</pre>
                      )}
                    </div>
                  );
                })}
                {results.length === 0 && (
                  <p className="text-gray-400">Click a button to see results</p>
                )}
              </div>
            </div>
          </div>

          {/* Code Examples */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Simple Tool Pattern</h2>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded text-sm overflow-x-auto">
{`// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: 72, 
    city: input.city 
  }))
  .render(({ data }) => (
    <div>{data.city}: {data.temp}°</div>
  ))`}
              </pre>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Complex Tool Pattern</h2>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded text-sm overflow-x-auto">
{`// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => 
    db.search(input.query)
  )
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { 
      body: input 
    });
  })
  .render(({ data }) => 
    <SearchResults results={data} />
  )`}
              </pre>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Key Features</h2>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Ultra-concise API - tools in 2-4 method calls</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Type-safe with Zod schema validation</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Server and client execution modes</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Built-in React rendering</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>Context for caching and state</span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>AI-ready tool execution</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}