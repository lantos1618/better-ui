'use client';

import React, { useState } from 'react';
import aui, { z } from '@/lib/aui';
import { useAUITool } from '@/lib/aui';

// Define tools with the concise API
const tools = {
  // Simple tool - just execute and render
  weather: aui
    .tool('weather')
    .input(z.object({ city: z.string() }))
    .execute(async ({ input }) => ({ 
      temp: Math.floor(60 + Math.random() * 30), 
      city: input.city,
      condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)]
    }))
    .render(({ data }) => (
      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="font-bold text-lg">{data.city}</h3>
        <p className="text-2xl">{data.temp}°F</p>
        <p className="text-gray-600">{data.condition}</p>
      </div>
    )),

  // Complex tool with client-side optimization
  search: aui
    .tool('search')
    .input(z.object({ 
      query: z.string(),
      limit: z.number().default(10)
    }))
    .execute(async ({ input }) => {
      // Simulated database search
      await new Promise(r => setTimeout(r, 500));
      return {
        results: Array.from({ length: input.limit } as ArrayLike<unknown>, (_, i) => ({
          id: i,
          title: `Result ${i + 1} for "${input.query}"`,
          score: Math.random()
        })),
        total: 100
      };
    })
    .clientExecute(async ({ input, ctx }) => {
      // Check cache first
      const cacheKey = `search:${input.query}:${input.limit}`;
      const cached = ctx.cache.get(cacheKey);
      if (cached) {
        console.log('Using cached results');
        return cached;
      }
      
      // Fetch from API
      const result = await ctx.fetch('/api/tools/search', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input) 
      }).then(r => r.json());
      
      // Cache for 1 minute
      ctx.cache.set(cacheKey, result);
      setTimeout(() => ctx.cache.delete(cacheKey), 60000);
      
      return result;
    })
    .render(({ data, loading }) => (
      <div className="space-y-2">
        {loading && <div>Searching...</div>}
        {data?.results?.map((item: any) => (
          <div key={item.id} className="p-3 bg-gray-50 rounded hover:bg-gray-100">
            <div className="font-medium">{item.title}</div>
            <div className="text-sm text-gray-500">Score: {item.score.toFixed(2)}</div>
          </div>
        ))}
        {data && (
          <div className="text-sm text-gray-600 mt-2">
            Showing {data.results.length} of {data.total} results
          </div>
        )}
      </div>
    )),

  // Database control tool
  database: aui
    .tool('database')
    .input(z.object({
      operation: z.enum(['create', 'read', 'update', 'delete']),
      collection: z.string(),
      data: z.any().optional()
    }))
    .execute(async ({ input }) => {
      console.log('Database operation:', input);
      switch (input.operation) {
        case 'create':
          return { 
            id: crypto.randomUUID(), 
            ...input.data,
            createdAt: new Date().toISOString()
          };
        case 'read':
          return { 
            items: [], 
            count: 0 
          };
        case 'update':
          return { 
            success: true,
            updatedAt: new Date().toISOString()
          };
        case 'delete':
          return { 
            success: true,
            deletedAt: new Date().toISOString()
          };
      }
    })
    .render(({ data, input }) => (
      <div className="p-4 bg-green-50 rounded-lg">
        <h4 className="font-bold">Database: {input?.operation}</h4>
        <pre className="text-xs mt-2">{JSON.stringify(data, null, 2)}</pre>
      </div>
    )),

  // UI control tool
  uiControl: aui
    .tool('ui_control')
    .input(z.object({
      action: z.enum(['show', 'hide', 'toggle', 'update']),
      target: z.string(),
      value: z.any().optional()
    }))
    .clientExecute(async ({ input }) => {
      const element = document.querySelector(input.target);
      if (!element) throw new Error(`Element ${input.target} not found`);
      
      switch (input.action) {
        case 'show':
          (element as HTMLElement).style.display = 'block';
          break;
        case 'hide':
          (element as HTMLElement).style.display = 'none';
          break;
        case 'toggle':
          const el = element as HTMLElement;
          el.style.display = el.style.display === 'none' ? 'block' : 'none';
          break;
        case 'update':
          if (input.value !== undefined) {
            if (element instanceof HTMLInputElement) {
              element.value = String(input.value);
            } else {
              element.textContent = String(input.value);
            }
          }
          break;
      }
      
      return { success: true, action: input.action, target: input.target };
    })
    .render(({ data }) => (
      <div className="p-2 bg-yellow-50 rounded">
        UI Control: {data?.action} on {data?.target}
      </div>
    ))
};

export default function AUIShowcase() {
  const [selectedTool, setSelectedTool] = useState<string>('weather');
  const [input, setInput] = useState<string>('{}');
  const [results, setResults] = useState<any[]>([]);
  
  const weatherTool = useAUITool(tools.weather);
  const searchTool = useAUITool(tools.search, { cache: true });
  const databaseTool = useAUITool(tools.database);
  const uiTool = useAUITool(tools.uiControl);
  
  const executeSelectedTool = async () => {
    try {
      const parsedInput = JSON.parse(input);
      let result: any;
      
      switch (selectedTool) {
        case 'weather':
          result = await weatherTool.execute(parsedInput);
          break;
        case 'search':
          result = await searchTool.execute(parsedInput);
          break;
        case 'database':
          result = await databaseTool.execute(parsedInput);
          break;
        case 'ui_control':
          result = await uiTool.execute(parsedInput);
          break;
      }
      
      setResults(prev => [...prev, { tool: selectedTool, input: parsedInput, output: result }]);
    } catch (error) {
      console.error('Error executing tool:', error);
      alert(`Error: ${error}`);
    }
  };
  
  const toolExamples: Record<string, string> = {
    weather: '{"city": "San Francisco"}',
    search: '{"query": "AI tools", "limit": 5}',
    database: '{"operation": "create", "collection": "users", "data": {"name": "John"}}',
    ui_control: '{"action": "update", "target": "#demo-text", "value": "Updated by AI!"}'
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">AUI System Showcase</h1>
        <p className="text-gray-600 mb-8">
          Concise API for AI to control frontend and backend in Next.js
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tool Executor */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Execute Tools</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Select Tool</label>
                <select 
                  value={selectedTool}
                  onChange={(e) => {
                    setSelectedTool(e.target.value);
                    setInput(toolExamples[e.target.value] || '{}');
                  }}
                  className="w-full p-2 border rounded"
                >
                  <option value="weather">Weather (Simple)</option>
                  <option value="search">Search (Complex with Cache)</option>
                  <option value="database">Database Operations</option>
                  <option value="ui_control">UI Control</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Input (JSON)</label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="w-full p-2 border rounded font-mono text-sm"
                  rows={4}
                />
              </div>
              
              <button
                onClick={executeSelectedTool}
                className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              >
                Execute Tool
              </button>
            </div>
            
            {/* Live Results */}
            <div className="mt-6">
              <h3 className="font-bold mb-2">Tool Output:</h3>
              {selectedTool === 'weather' && weatherTool.data && (
                <>{tools.weather.renderer && tools.weather.renderer({ 
                  data: weatherTool.data, 
                  loading: weatherTool.loading,
                  error: weatherTool.error || undefined
                })}</>
              )}
              {selectedTool === 'search' && searchTool.data && (
                <>{tools.search.renderer && tools.search.renderer({ 
                  data: searchTool.data,
                  loading: searchTool.loading,
                  error: searchTool.error || undefined
                })}</>
              )}
              {selectedTool === 'database' && databaseTool.data && (
                <>{tools.database.renderer && tools.database.renderer({ 
                  data: databaseTool.data,
                  input: JSON.parse(input),
                  loading: databaseTool.loading,
                  error: databaseTool.error || undefined
                })}</>
              )}
              {selectedTool === 'ui_control' && uiTool.data && (
                <>{tools.uiControl.renderer && tools.uiControl.renderer({ 
                  data: uiTool.data,
                  loading: uiTool.loading,
                  error: uiTool.error || undefined
                })}</>
              )}
            </div>
          </div>
          
          {/* Execution History */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Execution History</h2>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {results.length === 0 && (
                <p className="text-gray-500">No tools executed yet</p>
              )}
              
              {results.map((result, index) => (
                <div key={index} className="border rounded p-3">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-sm">{result.tool}</span>
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                  </div>
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="font-medium">Input:</span>
                      <pre className="bg-gray-50 p-1 rounded mt-1">
                        {JSON.stringify(result.input, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <span className="font-medium">Output:</span>
                      <pre className="bg-gray-50 p-1 rounded mt-1">
                        {JSON.stringify(result.output, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Demo Target for UI Control */}
        <div className="mt-8 p-6 bg-white rounded-lg shadow">
          <h3 className="font-bold mb-2">UI Control Demo Target</h3>
          <p id="demo-text" className="text-lg">
            This text can be updated by the UI Control tool
          </p>
        </div>
        
        {/* Code Example */}
        <div className="mt-8 bg-gray-900 text-white rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Code Example</h3>
          <pre className="text-sm overflow-x-auto">
{`// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>);

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />);`}
          </pre>
        </div>
      </div>
    </div>
  );
}