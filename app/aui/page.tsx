'use client';

import React, { useState } from 'react';
import aui from '@/lib/aui';
import { z } from 'zod';

// Simple tool - just 2 methods as requested
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: Math.floor(60 + Math.random() * 30), 
    city: input.city,
    conditions: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
  }))
  .render(({ data }) => (
    <div className="p-4 border rounded-lg bg-blue-50">
      <h3 className="font-bold text-lg">{data.city}</h3>
      <p className="text-2xl">{data.temp}°F</p>
      <p className="text-gray-600">{data.conditions}</p>
    </div>
  ));

// Complex tool with client optimization
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulate database search
    await new Promise(r => setTimeout(r, 500));
    return Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      title: `Result ${i + 1} for "${input.query}"`,
      description: `This is a search result matching your query: ${input.query}`
    }));
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    if (cached) return cached;
    
    // Fetch from API
    const result = await ctx.fetch('/api/aui/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'search', input })
    }).then(r => r.json());
    
    // Cache for 5 minutes
    ctx.cache.set(cacheKey, result);
    return result;
  })
  .render(({ data, loading }) => (
    <div className="space-y-2">
      {loading && <div className="animate-pulse">Searching...</div>}
      {data?.map((item: any) => (
        <div key={item.id} className="p-3 border rounded hover:bg-gray-50">
          <h4 className="font-semibold">{item.title}</h4>
          <p className="text-sm text-gray-600">{item.description}</p>
        </div>
      ))}
    </div>
  ));

// AI Control Tools - Frontend manipulation
const uiControlTool = aui
  .tool('ui-control')
  .input(z.object({
    action: z.enum(['show', 'hide', 'toggle', 'addClass', 'removeClass']),
    selector: z.string(),
    value: z.string().optional()
  }))
  .execute(async ({ input }) => {
    // This would be called by AI to control the UI
    const elements = document.querySelectorAll(input.selector);
    elements.forEach(el => {
      switch (input.action) {
        case 'show':
          (el as HTMLElement).style.display = 'block';
          break;
        case 'hide':
          (el as HTMLElement).style.display = 'none';
          break;
        case 'toggle':
          const elem = el as HTMLElement;
          elem.style.display = elem.style.display === 'none' ? 'block' : 'none';
          break;
        case 'addClass':
          if (input.value) el.classList.add(input.value);
          break;
        case 'removeClass':
          if (input.value) el.classList.remove(input.value);
          break;
      }
    });
    return { success: true, affected: elements.length };
  });

// Backend control tool
const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['create', 'read', 'update', 'delete']),
    table: z.string(),
    data: z.any().optional(),
    id: z.string().optional()
  }))
  .execute(async ({ input }) => {
    // Simulated database operations
    switch (input.operation) {
      case 'create':
        return { id: Math.random().toString(36).substr(2, 9), ...input.data };
      case 'read':
        return { id: input.id, data: { name: 'Sample Data' } };
      case 'update':
        return { id: input.id, updated: true };
      case 'delete':
        return { id: input.id, deleted: true };
      default:
        throw new Error('Invalid operation');
    }
  });

// Form handling tool
const formTool = aui
  .tool('form')
  .input(z.object({
    action: z.enum(['submit', 'reset', 'validate']),
    formId: z.string(),
    data: z.record(z.any()).optional()
  }))
  .clientExecute(async ({ input }) => {
    const form = document.getElementById(input.formId) as HTMLFormElement;
    if (!form) throw new Error('Form not found');
    
    switch (input.action) {
      case 'submit':
        const formData = new FormData(form);
        return Object.fromEntries(formData.entries());
      case 'reset':
        form.reset();
        return { reset: true };
      case 'validate':
        return { valid: form.checkValidity() };
    }
  });

export default function AUIDemo() {
  const [weatherData, setWeatherData] = useState<any>(null);
  const [searchResults, setSearchResults] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleWeatherCheck = async () => {
    addLog('Checking weather...');
    const result = await weatherTool.run({ city: 'San Francisco' });
    setWeatherData(result);
    addLog(`Weather retrieved: ${result.temp}°F, ${result.conditions}`);
  };

  const handleSearch = async (query: string) => {
    addLog(`Searching for: ${query}`);
    const results = await searchTool.run({ query });
    setSearchResults(results);
    addLog(`Found ${results.length} results`);
  };

  const handleUIControl = async (action: string) => {
    addLog(`UI Control: ${action}`);
    const result = await uiControlTool.run({
      action: action as any,
      selector: '.demo-element',
      value: 'highlighted'
    });
    addLog(`Affected ${result.affected} elements`);
  };

  const handleDatabaseOp = async () => {
    addLog('Creating database record...');
    const result = await databaseTool.run({
      operation: 'create',
      table: 'users',
      data: { name: 'John Doe', email: 'john@example.com' }
    });
    addLog(`Created record with ID: ${result.id}`);
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-4xl font-bold mb-8">AUI System - AI Control Demo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Simple Tools Section */}
        <div className="space-y-6">
          <section className="border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Simple Tools</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Weather Tool</h3>
                <button
                  onClick={handleWeatherCheck}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Check Weather
                </button>
                {weatherData && (
                  <div className="mt-4">
                    {weatherTool.renderer && weatherTool.renderer({ data: weatherData })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Search Tool</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search query..."
                    className="flex-1 px-3 py-2 border rounded"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch((e.target as HTMLInputElement).value);
                      }
                    }}
                  />
                  <button
                    onClick={() => handleSearch('AI tools')}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Search
                  </button>
                </div>
                {searchResults && (
                  <div className="mt-4">
                    {searchTool.renderer && searchTool.renderer({ data: searchResults })}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* AI Control Section */}
          <section className="border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">AI Control Tools</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">UI Manipulation</h3>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => handleUIControl('toggle')}
                    className="px-3 py-1 bg-purple-500 text-white rounded text-sm"
                  >
                    Toggle Elements
                  </button>
                  <button
                    onClick={() => handleUIControl('addClass')}
                    className="px-3 py-1 bg-purple-500 text-white rounded text-sm"
                  >
                    Add Class
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Backend Control</h3>
                <button
                  onClick={handleDatabaseOp}
                  className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
                >
                  Create Database Record
                </button>
              </div>

              <div className="demo-element p-4 border-2 border-dashed border-gray-300 rounded">
                <p className="text-gray-600">Demo element (AI can control this)</p>
              </div>
            </div>
          </section>
        </div>

        {/* Activity Log */}
        <div className="space-y-6">
          <section className="border rounded-lg p-6 h-full">
            <h2 className="text-2xl font-semibold mb-4">Activity Log</h2>
            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500">No activity yet...</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1">{log}</div>
                ))
              )}
            </div>
          </section>

          {/* Code Example */}
          <section className="border rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Code Example</h2>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
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
  ));

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => 
    db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', {
      body: input
    });
  })
  .render(({ data }) => 
    <SearchResults results={data} />);`}</code>
            </pre>
          </section>
        </div>
      </div>

      {/* Tool Registry Info */}
      <section className="mt-8 border rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Available Tools</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['weather', 'search', 'ui-control', 'database', 'form'].map(tool => (
            <div key={tool} className="p-3 bg-gray-50 rounded">
              <code className="text-sm font-mono">{tool}</code>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}