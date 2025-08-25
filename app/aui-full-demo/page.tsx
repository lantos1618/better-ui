'use client';

import React, { useState } from 'react';
import aui from '@/lib/aui';
import { z } from 'zod';

// Simple tool - just 2 methods
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city, conditions: 'Sunny' }))
  .render(({ data }) => (
    <div className="p-4 bg-blue-50 rounded">
      <h3 className="font-bold">{data.city}</h3>
      <p>{data.temp}°F - {data.conditions}</p>
    </div>
  ));

// Complex tool - adds client optimization
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulate server-side database search
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
      { id: 1, title: `Result 1 for "${input.query}"`, score: 0.95 },
      { id: 2, title: `Result 2 for "${input.query}"`, score: 0.87 },
      { id: 3, title: `Result 3 for "${input.query}"`, score: 0.76 }
    ];
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    const cached = ctx.cache.get(input.query);
    if (cached) {
      console.log(`Cache hit for: ${input.query}`);
      return cached;
    }
    
    // Fetch from API
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input) 
    }).then(r => r.json());
    
    // Cache the result
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <div className="space-y-2">
      {data.map((item: any) => (
        <div key={item.id} className="p-3 bg-gray-50 rounded hover:bg-gray-100 transition">
          <div className="font-medium">{item.title}</div>
          <div className="text-sm text-gray-600">Score: {item.score}</div>
        </div>
      ))}
    </div>
  ));

// Frontend control tool - AI can manipulate DOM
const uiControlTool = aui
  .tool('ui-control')
  .input(z.object({ 
    action: z.enum(['show', 'hide', 'toggle', 'highlight']),
    selector: z.string(),
    color: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    const elements = document.querySelectorAll(input.selector);
    if (elements.length === 0) throw new Error(`No elements found for: ${input.selector}`);
    
    elements.forEach(element => {
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
          el.style.backgroundColor = input.color || 'yellow';
          el.style.transition = 'background-color 0.3s';
          setTimeout(() => {
            el.style.backgroundColor = '';
          }, 2000);
          break;
      }
    });
    
    return { 
      success: true, 
      action: input.action, 
      affected: elements.length,
      selector: input.selector 
    };
  })
  .render(({ data }) => (
    <div className="p-2 bg-green-50 text-green-700 rounded">
      ✓ {data.action} performed on {data.affected} element(s)
    </div>
  ));

// Backend control - Database operations
const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['create', 'read', 'update', 'delete']),
    collection: z.string(),
    data: z.any().optional(),
    id: z.string().optional()
  }))
  .execute(async ({ input }) => {
    // Simulate database operations
    await new Promise(resolve => setTimeout(resolve, 300));
    
    switch (input.operation) {
      case 'create':
        return { 
          id: Math.random().toString(36).substr(2, 9), 
          ...input.data,
          createdAt: new Date().toISOString()
        };
      case 'read':
        return { 
          id: input.id || '1',
          collection: input.collection,
          data: { name: 'Sample Item', status: 'active' }
        };
      case 'update':
        return { 
          success: true, 
          id: input.id,
          updated: input.data,
          updatedAt: new Date().toISOString()
        };
      case 'delete':
        return { 
          success: true, 
          deleted: input.id,
          deletedAt: new Date().toISOString()
        };
    }
  })
  .render(({ data }) => (
    <pre className="p-3 bg-gray-900 text-green-400 rounded overflow-x-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  ));

// Dynamic form generator - AI can create forms
const formGeneratorTool = aui
  .tool('form-generator')
  .input(z.object({
    title: z.string(),
    fields: z.array(z.object({
      name: z.string(),
      type: z.enum(['text', 'number', 'email', 'select', 'checkbox']),
      label: z.string(),
      required: z.boolean().optional(),
      options: z.array(z.string()).optional(),
      placeholder: z.string().optional()
    }))
  }))
  .execute(async ({ input }) => input)
  .render(({ data }) => (
    <form className="space-y-4 p-4 bg-white rounded shadow" onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const values = Object.fromEntries(formData.entries());
      alert(`Form submitted: ${JSON.stringify(values, null, 2)}`);
    }}>
      <h3 className="text-lg font-bold">{data.title}</h3>
      {data.fields.map(field => (
        <div key={field.name}>
          <label className="block text-sm font-medium mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.type === 'select' ? (
            <select 
              name={field.name}
              required={field.required}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              {field.options?.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : field.type === 'checkbox' ? (
            <input
              type="checkbox"
              name={field.name}
              className="w-4 h-4"
            />
          ) : (
            <input
              type={field.type}
              name={field.name}
              required={field.required}
              placeholder={field.placeholder}
              className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      ))}
      <button 
        type="submit" 
        className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
      >
        Submit
      </button>
    </form>
  ));

export default function AUIFullDemo() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const executeTool = async (toolName: string, input: any) => {
    setLoading(prev => ({ ...prev, [toolName]: true }));
    try {
      const tool = aui.get(toolName);
      if (!tool) throw new Error(`Tool ${toolName} not found`);
      
      const result = await tool.run(input, aui.createContext());
      setResults(prev => ({ ...prev, [toolName]: result }));
    } catch (error) {
      console.error(`Error executing ${toolName}:`, error);
      setResults(prev => ({ ...prev, [toolName]: { error: error instanceof Error ? error.message : String(error) } }));
    } finally {
      setLoading(prev => ({ ...prev, [toolName]: false }));
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">AUI (Assistant-UI) Full Demo</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weather Tool Demo */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Simple Tool - Weather</h2>
          <div className="space-y-4">
            <button
              onClick={() => executeTool('weather', { city: 'New York' })}
              disabled={loading.weather}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading.weather ? 'Loading...' : 'Get Weather for New York'}
            </button>
            {results.weather && !results.weather.error && weatherTool.renderer?.({ 
              data: results.weather,
              loading: loading.weather 
            })}
          </div>
        </div>

        {/* Search Tool Demo */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Complex Tool - Search with Cache</h2>
          <div className="space-y-4">
            <button
              onClick={() => executeTool('search', { query: 'TypeScript' })}
              disabled={loading.search}
              className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
            >
              {loading.search ? 'Searching...' : 'Search for TypeScript'}
            </button>
            {results.search && !results.search.error && searchTool.renderer?.({ 
              data: results.search,
              loading: loading.search 
            })}
          </div>
        </div>

        {/* UI Control Demo */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Frontend Control - UI Manipulation</h2>
          <div className="space-y-3">
            <div id="demo-element" className="p-3 bg-yellow-100 rounded">
              Demo Element - AI can control this
            </div>
            <button
              onClick={() => executeTool('ui-control', { 
                action: 'highlight', 
                selector: '#demo-element',
                color: '#90EE90'
              })}
              disabled={loading['ui-control']}
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              Highlight Demo Element
            </button>
            {results['ui-control'] && !results['ui-control'].error && uiControlTool.renderer?.({ 
              data: results['ui-control'],
              loading: loading['ui-control'] 
            })}
          </div>
        </div>

        {/* Database Tool Demo */}
        <div className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Backend Control - Database</h2>
          <div className="space-y-3">
            <button
              onClick={() => executeTool('database', { 
                operation: 'create',
                collection: 'users',
                data: { name: 'John Doe', email: 'john@example.com' }
              })}
              disabled={loading.database}
              className="w-full bg-indigo-500 text-white px-4 py-2 rounded hover:bg-indigo-600 disabled:opacity-50"
            >
              Create User Record
            </button>
            {results.database && !results.database.error && databaseTool.renderer?.({ 
              data: results.database,
              loading: loading.database 
            })}
          </div>
        </div>

        {/* Form Generator Demo */}
        <div className="border rounded-lg p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Dynamic Form Generator</h2>
          <div className="space-y-4">
            <button
              onClick={() => executeTool('form-generator', {
                title: 'User Registration',
                fields: [
                  { name: 'username', type: 'text', label: 'Username', required: true, placeholder: 'Enter username' },
                  { name: 'email', type: 'email', label: 'Email', required: true, placeholder: 'user@example.com' },
                  { name: 'age', type: 'number', label: 'Age', required: false },
                  { name: 'country', type: 'select', label: 'Country', options: ['USA', 'UK', 'Canada', 'Other'] },
                  { name: 'newsletter', type: 'checkbox', label: 'Subscribe to newsletter' }
                ]
              })}
              disabled={loading['form-generator']}
              className="w-full bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
            >
              Generate Registration Form
            </button>
            {results['form-generator'] && !results['form-generator'].error && formGeneratorTool.renderer?.({ 
              data: results['form-generator'],
              loading: loading['form-generator'] 
            })}
          </div>
        </div>
      </div>

      <div className="mt-12 p-6 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">How It Works</h2>
        <div className="space-y-3 text-sm">
          <p><strong>Simple Tools:</strong> Just chain .tool().input().execute().render()</p>
          <p><strong>Client Optimization:</strong> Add .clientExecute() for caching, offline support</p>
          <p><strong>AI Control:</strong> Tools can manipulate both frontend (DOM) and backend (database)</p>
          <p><strong>Type Safety:</strong> Full TypeScript support with Zod validation</p>
          <p><strong>No Build Step:</strong> Tools return directly, no .build() needed</p>
        </div>
      </div>
    </div>
  );
}