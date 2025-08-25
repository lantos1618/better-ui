'use client';

import React, { useState } from 'react';
import aui from '@/lib/aui';
import { z } from 'zod';

// Define tools for AI control
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: Math.floor(Math.random() * 30) + 60, 
    city: input.city,
    condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)]
  }))
  .render(({ data }) => (
    <div className="p-4 bg-blue-50 rounded-lg">
      <h3 className="font-bold">{data.city}</h3>
      <p className="text-2xl">{data.temp}°F</p>
      <p className="text-gray-600">{data.condition}</p>
    </div>
  ));

const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulate database search
    await new Promise(r => setTimeout(r, 500));
    return Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      title: `Result ${i + 1} for "${input.query}"`,
      url: `https://example.com/${i + 1}`,
      snippet: `This is a search result containing ${input.query}...`
    }));
  })
  .clientExecute(async ({ input, ctx }) => {
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/aui/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool: 'search', input })
    }).then(r => r.json()).then(r => r.data);
    
    ctx.cache.set(cacheKey, result);
    return result;
  })
  .render(({ data }) => (
    <div className="space-y-2">
      {data.map((item: any) => (
        <div key={item.id} className="p-3 border rounded hover:bg-gray-50">
          <h4 className="font-semibold text-blue-600">{item.title}</h4>
          <p className="text-sm text-gray-600">{item.snippet}</p>
          <a href={item.url} className="text-xs text-green-600">{item.url}</a>
        </div>
      ))}
    </div>
  ));

const uiControlTool = aui
  .tool('ui-control')
  .input(z.object({
    action: z.enum(['show', 'hide', 'toggle', 'highlight', 'scroll']),
    selector: z.string(),
    options: z.object({
      duration: z.number().optional(),
      color: z.string().optional()
    }).optional()
  }))
  .clientExecute(async ({ input }) => {
    const elements = document.querySelectorAll(input.selector);
    if (!elements.length) throw new Error(`No elements found for selector: ${input.selector}`);
    
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
          el.style.backgroundColor = input.options?.color || 'yellow';
          if (input.options?.duration) {
            setTimeout(() => {
              el.style.backgroundColor = '';
            }, input.options.duration);
          }
          break;
        case 'scroll':
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
      }
    });
    
    return { 
      success: true, 
      action: input.action, 
      selector: input.selector,
      count: elements.length 
    };
  })
  .render(({ data }) => (
    <div className="text-green-600 p-2 bg-green-50 rounded">
      ✓ {data.action} performed on {data.count} element(s) matching &quot;{data.selector}&quot;
    </div>
  ));

const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['create', 'read', 'update', 'delete', 'list']),
    collection: z.string(),
    data: z.any().optional(),
    filter: z.any().optional()
  }))
  .execute(async ({ input }) => {
    // Simulate database operations
    switch (input.operation) {
      case 'create':
        return { 
          id: Math.random().toString(36).substr(2, 9), 
          ...input.data,
          createdAt: new Date().toISOString()
        };
      case 'read':
        return { 
          id: input.filter?.id || '1',
          collection: input.collection,
          data: { name: 'Sample', value: 100 }
        };
      case 'list':
        return Array.from({ length: 3 }, (_, i) => ({
          id: `item-${i + 1}`,
          name: `Item ${i + 1}`,
          collection: input.collection
        }));
      case 'update':
        return { success: true, updated: 1, data: input.data };
      case 'delete':
        return { success: true, deleted: 1, id: input.filter?.id };
      default:
        throw new Error('Unknown operation');
    }
  })
  .render(({ data }) => (
    <pre className="bg-gray-900 text-green-400 p-3 rounded overflow-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  ));

const formTool = aui
  .tool('dynamic-form')
  .input(z.object({
    title: z.string(),
    fields: z.array(z.object({
      name: z.string(),
      label: z.string(),
      type: z.enum(['text', 'number', 'email', 'password', 'select', 'checkbox', 'textarea']),
      required: z.boolean().optional(),
      placeholder: z.string().optional(),
      options: z.array(z.object({
        value: z.string(),
        label: z.string()
      })).optional()
    })),
    submitLabel: z.string().optional()
  }))
  .execute(async ({ input }) => input)
  .render(({ data }) => (
    <form 
      className="space-y-4 p-4 border rounded-lg"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const values = Object.fromEntries(formData);
        alert(`Form submitted: ${JSON.stringify(values, null, 2)}`);
      }}
    >
      <h3 className="text-lg font-semibold">{data.title}</h3>
      {data.fields.map(field => (
        <div key={field.name}>
          <label className="block text-sm font-medium mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.type === 'select' && field.options ? (
            <select 
              name={field.name}
              required={field.required}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select...</option>
              {field.options.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea
              name={field.name}
              required={field.required}
              placeholder={field.placeholder}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          ) : field.type === 'checkbox' ? (
            <input
              type="checkbox"
              name={field.name}
              className="ml-2"
            />
          ) : (
            <input
              type={field.type}
              name={field.name}
              required={field.required}
              placeholder={field.placeholder}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      ))}
      <button 
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        {data.submitLabel || 'Submit'}
      </button>
    </form>
  ));

export default function AUIShowcase() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const executeDemo = async (toolName: string, input: any) => {
    setLoading(true);
    try {
      const tool = aui.get(toolName);
      if (!tool) throw new Error(`Tool ${toolName} not found`);
      
      const result = await tool.run(input);
      const Component = tool.renderer;
      
      setResults(prev => [{
        id: Date.now(),
        tool: toolName,
        input,
        result,
        Component,
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 4)]);
    } catch (error) {
      console.error('Execution error:', error);
      alert(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const demos = [
    {
      title: 'Weather Check',
      tool: 'weather',
      input: { city: 'San Francisco' },
      description: 'Get weather information for a city'
    },
    {
      title: 'Search Content',
      tool: 'search',
      input: { query: 'artificial intelligence' },
      description: 'Search with client-side caching'
    },
    {
      title: 'Control UI',
      tool: 'ui-control',
      input: { action: 'highlight', selector: '.demo-card', options: { color: '#ffeb3b', duration: 2000 } },
      description: 'Manipulate DOM elements'
    },
    {
      title: 'Database Operation',
      tool: 'database',
      input: { operation: 'create', collection: 'users', data: { name: 'John Doe', email: 'john@example.com' } },
      description: 'Perform database operations'
    },
    {
      title: 'Dynamic Form',
      tool: 'dynamic-form',
      input: {
        title: 'User Registration',
        fields: [
          { name: 'username', label: 'Username', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'role', label: 'Role', type: 'select', options: [
            { value: 'user', label: 'User' },
            { value: 'admin', label: 'Admin' }
          ]}
        ],
        submitLabel: 'Register'
      },
      description: 'Generate forms dynamically'
    }
  ];

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AUI System Showcase</h1>
        <p className="text-gray-600">
          Assistant-UI tools for AI control of frontend and backend in Next.js
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Tool Demos</h2>
          <div className="space-y-3">
            {demos.map((demo, idx) => (
              <div key={idx} className="demo-card p-4 border rounded-lg hover:shadow-lg transition-shadow">
                <h3 className="font-semibold mb-1">{demo.title}</h3>
                <p className="text-sm text-gray-600 mb-2">{demo.description}</p>
                <button
                  onClick={() => executeDemo(demo.tool, demo.input)}
                  disabled={loading}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? 'Executing...' : 'Execute'}
                </button>
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer">View Input</summary>
                  <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                    {JSON.stringify(demo.input, null, 2)}
                  </pre>
                </details>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Execution Results</h2>
          <div className="space-y-4">
            {results.length === 0 ? (
              <p className="text-gray-500 italic">No results yet. Execute a demo to see results here.</p>
            ) : (
              results.map((result) => (
                <div key={result.id} className="border rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">{result.tool}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  {result.Component && (
                    <result.Component 
                      data={result.result} 
                      input={result.input}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Key Features</h2>
        <ul className="space-y-1 text-sm">
          <li>✓ Simple chainable API without .build() methods</li>
          <li>✓ Server and client execution support</li>
          <li>✓ React component rendering</li>
          <li>✓ TypeScript support with Zod validation</li>
          <li>✓ Caching and optimization capabilities</li>
          <li>✓ AI can control both frontend DOM and backend operations</li>
        </ul>
      </div>
    </div>
  );
}