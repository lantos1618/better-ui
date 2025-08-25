'use client';

import React, { useState } from 'react';
import aui from '@/lib/aui';
import { z } from 'zod';

// Simple weather tool - minimal API surface
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: Math.floor(Math.random() * 30) + 60,
    city: input.city,
    conditions: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)]
  }))
  .render(({ data }) => (
    <div className="p-4 bg-blue-50 rounded-lg">
      <h3 className="font-bold text-lg">{data.city}</h3>
      <p className="text-2xl">{data.temp}°F</p>
      <p className="text-gray-600">{data.conditions}</p>
    </div>
  ));

// Advanced search with client-side caching
const searchTool = aui
  .tool('search')
  .input(z.object({ 
    query: z.string(),
    limit: z.number().optional().default(10)
  }))
  .execute(async ({ input }) => {
    // Server-side search logic
    await new Promise(r => setTimeout(r, 500)); // Simulate delay
    return Array.from({ length: input.limit }, (_, i) => ({
      id: i + 1,
      title: `Result ${i + 1} for "${input.query}"`,
      score: Math.random()
    })).sort((a, b) => b.score - a.score);
  })
  .clientExecute(async ({ input, ctx }) => {
    const cacheKey = `search:${input.query}:${input.limit}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 60000) {
      console.log('Using cached results');
      return cached.data;
    }
    
    const data = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
    
    ctx.cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  })
  .render(({ data, input }) => (
    <div className="space-y-2">
      <h3 className="font-semibold">Results for "{input?.query}":</h3>
      {data.map((item: any) => (
        <div key={item.id} className="p-3 bg-white border rounded-lg hover:shadow-md transition-shadow">
          <div className="flex justify-between">
            <span className="font-medium">{item.title}</span>
            <span className="text-sm text-gray-500">Score: {item.score.toFixed(2)}</span>
          </div>
        </div>
      ))}
    </div>
  ));

// UI Control tool for AI to manipulate the frontend
const uiControlTool = aui
  .tool('ui-control')
  .input(z.object({
    action: z.enum(['addClass', 'removeClass', 'toggleClass', 'setText', 'setStyle']),
    selector: z.string(),
    value: z.string()
  }))
  .clientExecute(async ({ input }) => {
    const elements = document.querySelectorAll(input.selector);
    if (elements.length === 0) {
      throw new Error(`No elements found for selector: ${input.selector}`);
    }
    
    elements.forEach(el => {
      const element = el as HTMLElement;
      switch (input.action) {
        case 'addClass':
          element.classList.add(input.value);
          break;
        case 'removeClass':
          element.classList.remove(input.value);
          break;
        case 'toggleClass':
          element.classList.toggle(input.value);
          break;
        case 'setText':
          element.textContent = input.value;
          break;
        case 'setStyle':
          const [prop, val] = input.value.split(':');
          element.style.setProperty(prop, val);
          break;
      }
    });
    
    return { 
      success: true, 
      action: input.action, 
      selector: input.selector,
      affected: elements.length 
    };
  })
  .render(({ data }) => (
    <div className="p-2 bg-green-50 text-green-800 rounded">
      ✓ {data.action} on {data.affected} element(s)
    </div>
  ));

// Backend control for database operations
const dbTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['find', 'create', 'update', 'delete']),
    collection: z.string(),
    query: z.record(z.any()).optional(),
    data: z.record(z.any()).optional()
  }))
  .execute(async ({ input }) => {
    // This would connect to your actual database
    const mockDb: Record<string, any[]> = {
      users: [
        { id: 1, name: 'Alice', email: 'alice@example.com' },
        { id: 2, name: 'Bob', email: 'bob@example.com' }
      ],
      posts: [
        { id: 1, title: 'First Post', authorId: 1 },
        { id: 2, title: 'Second Post', authorId: 2 }
      ]
    };
    
    switch (input.operation) {
      case 'find':
        return mockDb[input.collection] || [];
      case 'create':
        return { id: Date.now(), ...input.data };
      case 'update':
        return { updated: true, ...input.data };
      case 'delete':
        return { deleted: true, query: input.query };
      default:
        throw new Error(`Unknown operation: ${input.operation}`);
    }
  })
  .render(({ data, input }) => (
    <div className="p-3 bg-gray-50 rounded-lg">
      <div className="text-sm text-gray-600 mb-2">
        {input?.operation} on {input?.collection}
      </div>
      <pre className="text-xs overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  ));

export default function AUIShowcase() {
  const [results, setResults] = useState<Array<{ tool: string; result: any }>>([]);
  const [loading, setLoading] = useState(false);

  const runTool = async (toolName: string, input: any) => {
    setLoading(true);
    try {
      const tool = aui.get(toolName);
      if (!tool) throw new Error(`Tool ${toolName} not found`);
      
      const result = await tool.run(input);
      setResults(prev => [...prev, { tool: toolName, result }]);
    } catch (error) {
      console.error(`Error running ${toolName}:`, error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">AUI System Demo</h1>
        <p className="text-gray-600">Clean, concise API for AI-controlled tools in Next.js</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Simple Weather Tool</h2>
          <button
            onClick={() => runTool('weather', { city: 'San Francisco' })}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            disabled={loading}
          >
            Get Weather
          </button>
          {weatherTool.renderer && weatherTool.renderer({ 
            data: { temp: 72, city: 'San Francisco', conditions: 'sunny' },
            loading: false
          })}
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Search with Caching</h2>
          <button
            onClick={() => runTool('search', { query: 'AI tools', limit: 5 })}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
            disabled={loading}
          >
            Search
          </button>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">UI Control</h2>
          <button
            onClick={() => runTool('ui-control', { 
              action: 'toggleClass', 
              selector: '.demo-target', 
              value: 'bg-yellow-200' 
            })}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            disabled={loading}
          >
            Toggle Highlight
          </button>
          <div className="demo-target mt-2 p-2 border rounded transition-colors">
            Target Element
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-3">Database Operations</h2>
          <button
            onClick={() => runTool('database', { 
              operation: 'find', 
              collection: 'users' 
            })}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            disabled={loading}
          >
            Query Users
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">Results</h2>
          <div className="space-y-3">
            {results.map((r, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded">
                <div className="font-medium text-sm text-gray-600 mb-1">
                  Tool: {r.tool}
                </div>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(r.result, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}