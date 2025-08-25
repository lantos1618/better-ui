'use client';

import React, { useState } from 'react';
import aui from '@/lib/aui';
import { z } from 'zod';

// Simple tool - just 2 methods
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city, condition: 'Sunny' }))
  .render(({ data }) => (
    <div className="p-4 bg-blue-50 rounded-lg">
      <h3 className="font-bold">{data.city}</h3>
      <p className="text-2xl">{data.temp}°F</p>
      <p className="text-gray-600">{data.condition}</p>
    </div>
  ));

// Complex tool - adds client optimization
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulate server-side database search
    return [
      { id: 1, title: `Result for ${input.query}`, score: 0.98 },
      { id: 2, title: `Another result for ${input.query}`, score: 0.85 }
    ];
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side caching
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    }).then(r => r.json());
    
    ctx.cache.set(cacheKey, result);
    return result;
  })
  .render(({ data }) => (
    <div className="space-y-2">
      <h3 className="font-semibold">Search Results:</h3>
      {data.map((item: any) => (
        <div key={item.id} className="p-3 border rounded hover:bg-gray-50">
          <div className="font-medium">{item.title}</div>
          <div className="text-sm text-gray-500">Score: {item.score}</div>
        </div>
      ))}
    </div>
  ));

// Frontend control tool
const uiControlTool = aui
  .tool('ui-control')
  .input(z.object({
    action: z.enum(['show', 'hide', 'toggle', 'highlight']),
    selector: z.string(),
    options: z.object({
      duration: z.number().optional(),
      color: z.string().optional()
    }).optional()
  }))
  .execute(async ({ input }) => {
    const element = document.querySelector(input.selector);
    if (!element) return { success: false, message: 'Element not found' };
    
    const el = element as HTMLElement;
    switch (input.action) {
      case 'show':
        el.style.display = 'block';
        break;
      case 'hide':
        el.style.display = 'none';
        break;
      case 'toggle':
        el.style.display = el.style.display === 'none' ? 'block' : 'none';
        break;
      case 'highlight':
        const original = el.style.backgroundColor;
        el.style.backgroundColor = input.options?.color || 'yellow';
        if (input.options?.duration) {
          setTimeout(() => {
            el.style.backgroundColor = original;
          }, input.options.duration);
        }
        break;
    }
    return { success: true, action: input.action, selector: input.selector };
  })
  .render(({ data }) => (
    <div className={`p-2 rounded ${data.success ? 'bg-green-100' : 'bg-red-100'}`}>
      {data.success ? `✓ ${data.action} on ${data.selector}` : data.message}
    </div>
  ));

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
    // Simulate database operations
    switch (input.operation) {
      case 'create':
        return { id: Math.random().toString(36), ...input.data, created: new Date() };
      case 'read':
        return { id: input.id, table: input.table, data: { name: 'Sample' } };
      case 'update':
        return { id: input.id, updated: true, changes: input.data };
      case 'delete':
        return { id: input.id, deleted: true };
      default:
        return { error: 'Unknown operation' };
    }
  })
  .render(({ data }) => (
    <div className="p-3 bg-gray-50 rounded font-mono text-sm">
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  ));

// Form generation tool
const formTool = aui
  .tool('form-generator')
  .input(z.object({
    fields: z.array(z.object({
      name: z.string(),
      type: z.enum(['text', 'number', 'email', 'select']),
      label: z.string(),
      options: z.array(z.string()).optional(),
      required: z.boolean().optional()
    })),
    submitAction: z.string().optional()
  }))
  .execute(async ({ input }) => {
    return { 
      formId: `form-${Date.now()}`,
      fields: input.fields,
      created: true 
    };
  })
  .render(({ data, input }) => (
    <form className="space-y-4 p-4 border rounded">
      {input?.fields.map((field) => (
        <div key={field.name}>
          <label className="block text-sm font-medium mb-1">
            {field.label} {field.required && '*'}
          </label>
          {field.type === 'select' ? (
            <select className="w-full p-2 border rounded">
              {field.options?.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type={field.type}
              name={field.name}
              required={field.required}
              className="w-full p-2 border rounded"
            />
          )}
        </div>
      ))}
      <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
        Submit
      </button>
    </form>
  ));

export default function AUICompleteDemo() {
  const [results, setResults] = useState<any[]>([]);
  const [activeDemo, setActiveDemo] = useState('weather');

  const runDemo = async (demo: string) => {
    let result;
    switch (demo) {
      case 'weather':
        result = await weatherTool.run({ city: 'San Francisco' });
        break;
      case 'search':
        result = await searchTool.run({ query: 'Next.js tutorials' });
        break;
      case 'ui-control':
        result = await uiControlTool.run({
          action: 'highlight',
          selector: '#demo-target',
          options: { duration: 2000, color: '#fef3c7' }
        });
        break;
      case 'database':
        result = await databaseTool.run({
          operation: 'create',
          table: 'users',
          data: { name: 'John Doe', email: 'john@example.com' }
        });
        break;
      case 'form':
        result = await formTool.run({
          fields: [
            { name: 'name', type: 'text', label: 'Full Name', required: true },
            { name: 'email', type: 'email', label: 'Email Address', required: true },
            { name: 'role', type: 'select', label: 'Role', options: ['User', 'Admin', 'Editor'] }
          ]
        });
        break;
    }
    setResults(prev => [...prev, { tool: demo, result, timestamp: new Date() }]);
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-4xl font-bold mb-2">AUI Complete Demo</h1>
      <p className="text-gray-600 mb-8">
        Concise API for AI-controlled frontend and backend operations in Next.js
      </p>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Controls */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Tool Controls</h2>
          <div className="space-y-3">
            <button
              onClick={() => runDemo('weather')}
              className="w-full p-3 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Weather Tool (Simple)
            </button>
            <button
              onClick={() => runDemo('search')}
              className="w-full p-3 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Search Tool (With Caching)
            </button>
            <button
              onClick={() => runDemo('ui-control')}
              className="w-full p-3 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              UI Control Tool (Frontend)
            </button>
            <button
              onClick={() => runDemo('database')}
              className="w-full p-3 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Database Tool (Backend)
            </button>
            <button
              onClick={() => runDemo('form')}
              className="w-full p-3 bg-pink-500 text-white rounded hover:bg-pink-600"
            >
              Form Generator Tool
            </button>
          </div>

          <div id="demo-target" className="mt-6 p-4 border-2 border-dashed rounded">
            <p className="text-center text-gray-500">UI Control Target Element</p>
          </div>
        </div>

        {/* Results */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Results</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-gray-500">Click a button to see results</p>
            ) : (
              results.map((r, i) => (
                <div key={i} className="border rounded p-3">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">{r.tool}</span>
                    <span className="text-xs text-gray-500">
                      {r.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  {/* Render the tool's component if available */}
                  {r.tool === 'weather' && weatherTool.renderer && 
                    weatherTool.renderer({ data: r.result })}
                  {r.tool === 'search' && searchTool.renderer && 
                    searchTool.renderer({ data: r.result })}
                  {r.tool === 'ui-control' && uiControlTool.renderer && 
                    uiControlTool.renderer({ data: r.result })}
                  {r.tool === 'database' && databaseTool.renderer && 
                    databaseTool.renderer({ data: r.result })}
                  {r.tool === 'form' && formTool.renderer && 
                    formTool.renderer({ data: r.result, input: { fields: [
                      { name: 'name', type: 'text' as const, label: 'Full Name', required: true },
                      { name: 'email', type: 'email' as const, label: 'Email Address', required: true },
                      { name: 'role', type: 'select' as const, label: 'Role', options: ['User', 'Admin', 'Editor'] }
                    ]}})}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Code Examples */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-4">Code Examples</h2>
        <div className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto">
          <pre className="text-sm">{`// Simple tool - just 2 methods
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
  .render(({ data }) => <SearchResults results={data} />)`}</pre>
        </div>
      </div>
    </div>
  );
}