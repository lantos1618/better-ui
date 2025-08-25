'use client';

import React, { useState } from 'react';
import aui from '@/lib/aui';
import { z } from 'zod';

// Simple weather tool - minimal setup
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
      <p>{data.temp}°F - {data.condition}</p>
    </div>
  ));

// Search tool with client-side caching
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulate server-side database search
    await new Promise(r => setTimeout(r, 500));
    return Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      title: `Result ${i + 1} for "${input.query}"`,
      description: `This is a search result for ${input.query}`
    }));
  })
  .clientExecute(async ({ input, ctx }) => {
    // Check cache first
    const cacheKey = `search:${input.query}`;
    if (ctx.cache.has(cacheKey)) {
      console.log('Returning cached results for:', input.query);
      return ctx.cache.get(cacheKey);
    }
    
    // Fetch from API
    const response = await ctx.fetch('/api/tools/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input)
    });
    
    const data = await response.json();
    ctx.cache.set(cacheKey, data);
    return data;
  })
  .render(({ data, loading, error }) => {
    if (loading) return <div>Searching...</div>;
    if (error) return <div className="text-red-500">Error: {error.message}</div>;
    
    return (
      <div className="space-y-2">
        {data.map((item: any) => (
          <div key={item.id} className="p-3 bg-gray-50 rounded">
            <h4 className="font-semibold">{item.title}</h4>
            <p className="text-sm text-gray-600">{item.description}</p>
          </div>
        ))}
      </div>
    );
  });

// UI Control tool - manipulate DOM elements
const uiControlTool = aui
  .tool('ui-control')
  .input(z.object({
    action: z.enum(['show', 'hide', 'toggle', 'addClass', 'removeClass']),
    selector: z.string(),
    className: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    const elements = document.querySelectorAll(input.selector);
    if (!elements.length) {
      throw new Error(`No elements found for selector: ${input.selector}`);
    }
    
    elements.forEach(element => {
      const el = element as HTMLElement;
      switch (input.action) {
        case 'show':
          el.style.display = '';
          break;
        case 'hide':
          el.style.display = 'none';
          break;
        case 'toggle':
          el.style.display = el.style.display === 'none' ? '' : 'none';
          break;
        case 'addClass':
          if (input.className) el.classList.add(input.className);
          break;
        case 'removeClass':
          if (input.className) el.classList.remove(input.className);
          break;
      }
    });
    
    return { 
      success: true, 
      action: input.action, 
      selector: input.selector,
      affectedElements: elements.length
    };
  })
  .render(({ data }) => (
    <div className="p-2 bg-green-50 text-green-700 rounded">
      ✓ {data.action} on {data.affectedElements} element(s)
    </div>
  ));

// Database tool - backend operations
const databaseTool = aui
  .tool('database')
  .input(z.object({
    operation: z.enum(['create', 'read', 'update', 'delete', 'list']),
    collection: z.string(),
    id: z.string().optional(),
    data: z.record(z.any()).optional(),
    filter: z.record(z.any()).optional()
  }))
  .execute(async ({ input }) => {
    // This would connect to your real database
    // For demo, we'll simulate operations
    const mockDb: Record<string, any[]> = {
      users: [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: 'bob@example.com' }
      ],
      posts: [
        { id: '1', title: 'First Post', authorId: '1' },
        { id: '2', title: 'Second Post', authorId: '2' }
      ]
    };
    
    switch (input.operation) {
      case 'create':
        const newItem = { 
          id: Date.now().toString(), 
          ...input.data,
          createdAt: new Date().toISOString()
        };
        return { success: true, data: newItem };
        
      case 'read':
        const item = mockDb[input.collection]?.find(i => i.id === input.id);
        if (!item) throw new Error('Item not found');
        return { success: true, data: item };
        
      case 'list':
        return { 
          success: true, 
          data: mockDb[input.collection] || [],
          count: mockDb[input.collection]?.length || 0
        };
        
      case 'update':
        return { 
          success: true, 
          data: { id: input.id, ...input.data },
          message: 'Item updated'
        };
        
      case 'delete':
        return { 
          success: true, 
          message: `Item ${input.id} deleted`
        };
        
      default:
        throw new Error('Unknown operation');
    }
  })
  .render(({ data }) => (
    <div className="p-3 bg-gray-100 rounded">
      <pre className="text-sm">{JSON.stringify(data, null, 2)}</pre>
    </div>
  ));

// Form generator - AI can create dynamic forms
const formGeneratorTool = aui
  .tool('form-generator')
  .input(z.object({
    title: z.string(),
    fields: z.array(z.object({
      name: z.string(),
      type: z.enum(['text', 'number', 'email', 'textarea', 'select', 'checkbox']),
      label: z.string(),
      placeholder: z.string().optional(),
      required: z.boolean().optional(),
      options: z.array(z.object({
        value: z.string(),
        label: z.string()
      })).optional()
    })),
    submitAction: z.string().optional()
  }))
  .execute(async ({ input }) => input)
  .render(({ data }) => (
    <form 
      className="space-y-4 p-4 border rounded"
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        console.log('Form submitted:', Object.fromEntries(formData));
        alert('Form submitted! Check console for data.');
      }}
    >
      <h3 className="text-lg font-bold">{data.title}</h3>
      
      {data.fields.map(field => (
        <div key={field.name} className="space-y-1">
          <label className="block text-sm font-medium">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {field.type === 'select' ? (
            <select 
              name={field.name}
              required={field.required}
              className="w-full p-2 border rounded"
            >
              <option value="">Select...</option>
              {field.options?.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : field.type === 'textarea' ? (
            <textarea
              name={field.name}
              placeholder={field.placeholder}
              required={field.required}
              className="w-full p-2 border rounded"
              rows={3}
            />
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
              placeholder={field.placeholder}
              required={field.required}
              className="w-full p-2 border rounded"
            />
          )}
        </div>
      ))}
      
      <button 
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        {data.submitAction || 'Submit'}
      </button>
    </form>
  ));

// Analytics tool - track events
const analyticsTool = aui
  .tool('analytics')
  .input(z.object({
    event: z.string(),
    properties: z.record(z.any()).optional(),
    userId: z.string().optional()
  }))
  .clientExecute(async ({ input }) => {
    // In production, this would send to your analytics service
    console.log('📊 Analytics Event:', input);
    
    // Store in localStorage for demo
    const events = JSON.parse(localStorage.getItem('analytics_events') || '[]');
    events.push({
      ...input,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('analytics_events', JSON.stringify(events));
    
    return { 
      success: true, 
      event: input.event,
      tracked: true
    };
  })
  .render(({ data }) => (
    <div className="p-2 bg-purple-50 text-purple-700 rounded">
      📊 Event tracked: {data.event}
    </div>
  ));

export default function AUICompletePage() {
  const [results, setResults] = useState<Array<{ tool: string; result: any }>>([]);
  const [loading, setLoading] = useState(false);
  
  const executeTool = async (toolName: string, input: any) => {
    setLoading(true);
    try {
      const tool = aui.get(toolName);
      if (!tool) throw new Error(`Tool ${toolName} not found`);
      
      const result = await tool.run(input);
      setResults(prev => [...prev, { tool: toolName, result }]);
    } catch (error) {
      console.error('Tool execution error:', error);
      setResults(prev => [...prev, { 
        tool: toolName, 
        result: { error: (error as Error).message }
      }]);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">AUI Complete System</h1>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <section className="border rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Simple Tools</h2>
            
            <div className="space-y-3">
              <button
                onClick={() => executeTool('weather', { city: 'San Francisco' })}
                className="bg-blue-500 text-white px-4 py-2 rounded w-full"
              >
                Get Weather (San Francisco)
              </button>
              
              <button
                onClick={() => executeTool('search', { query: 'AI tools' })}
                className="bg-green-500 text-white px-4 py-2 rounded w-full"
              >
                Search for &quot;AI tools&quot;
              </button>
            </div>
          </section>
          
          <section className="border rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Frontend Control</h2>
            
            <div className="space-y-3">
              <div id="demo-element" className="p-3 bg-yellow-100 rounded">
                Demo Element (can be hidden/shown)
              </div>
              
              <button
                onClick={() => executeTool('ui-control', { 
                  action: 'toggle', 
                  selector: '#demo-element' 
                })}
                className="bg-purple-500 text-white px-4 py-2 rounded w-full"
              >
                Toggle Demo Element
              </button>
              
              <button
                onClick={() => executeTool('analytics', { 
                  event: 'button_clicked',
                  properties: { button: 'demo', timestamp: Date.now() }
                })}
                className="bg-indigo-500 text-white px-4 py-2 rounded w-full"
              >
                Track Analytics Event
              </button>
            </div>
          </section>
          
          <section className="border rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Backend Control</h2>
            
            <div className="space-y-3">
              <button
                onClick={() => executeTool('database', { 
                  operation: 'list',
                  collection: 'users'
                })}
                className="bg-gray-600 text-white px-4 py-2 rounded w-full"
              >
                List Users from Database
              </button>
              
              <button
                onClick={() => executeTool('database', { 
                  operation: 'create',
                  collection: 'posts',
                  data: { 
                    title: 'AI Generated Post',
                    content: 'This post was created by AI'
                  }
                })}
                className="bg-gray-700 text-white px-4 py-2 rounded w-full"
              >
                Create Database Entry
              </button>
            </div>
          </section>
          
          <section className="border rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4">Dynamic Form Generation</h2>
            
            <button
              onClick={() => executeTool('form-generator', {
                title: 'Contact Form',
                fields: [
                  { 
                    name: 'name', 
                    type: 'text', 
                    label: 'Full Name',
                    required: true,
                    placeholder: 'John Doe'
                  },
                  { 
                    name: 'email', 
                    type: 'email', 
                    label: 'Email',
                    required: true,
                    placeholder: 'john@example.com'
                  },
                  {
                    name: 'subject',
                    type: 'select',
                    label: 'Subject',
                    options: [
                      { value: 'support', label: 'Support' },
                      { value: 'sales', label: 'Sales' },
                      { value: 'other', label: 'Other' }
                    ]
                  },
                  {
                    name: 'message',
                    type: 'textarea',
                    label: 'Message',
                    placeholder: 'Your message here...'
                  },
                  {
                    name: 'subscribe',
                    type: 'checkbox',
                    label: 'Subscribe to newsletter'
                  }
                ],
                submitAction: 'Send Message'
              })}
              className="bg-orange-500 text-white px-4 py-2 rounded w-full"
            >
              Generate Contact Form
            </button>
          </section>
        </div>
        
        <div className="space-y-6">
          <section className="border rounded-lg p-4 h-full">
            <h2 className="text-xl font-semibold mb-4">Results</h2>
            
            {loading && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            )}
            
            <div className="space-y-4 max-h-[800px] overflow-y-auto">
              {results.map((item, index) => {
                const tool = aui.get(item.tool);
                const Renderer = tool?.renderer;
                
                return (
                  <div key={index} className="border-b pb-4">
                    <h3 className="font-semibold mb-2">
                      Tool: {item.tool}
                    </h3>
                    {item.result.error ? (
                      <div className="text-red-500">
                        Error: {item.result.error}
                      </div>
                    ) : Renderer ? (
                      <Renderer data={item.result} />
                    ) : (
                      <pre className="bg-gray-100 p-2 rounded text-sm overflow-x-auto">
                        {JSON.stringify(item.result, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
              
              {results.length === 0 && !loading && (
                <p className="text-gray-500 text-center py-8">
                  Click buttons on the left to execute tools and see results here
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-bold mb-2">How it works:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Simple tools use just .input() and .execute() for basic server operations</li>
          <li>Complex tools add .clientExecute() for caching and offline support</li>
          <li>.render() provides custom UI components for tool results</li>
          <li>Tools can control both frontend (DOM, UI) and backend (database, API)</li>
          <li>AI can use these tools to manipulate your application</li>
        </ul>
      </div>
    </div>
  );
}