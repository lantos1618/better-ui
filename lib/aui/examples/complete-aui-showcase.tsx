'use client';

import React, { useState } from 'react';
import aui, { z } from '../index';

// ============================================
// COMPLETE AUI SHOWCASE - All Patterns
// ============================================

// 1. SIMPLEST FORM - Just 2 methods for basic tools
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }: { input: any }) => ({ temp: 72, city: input.city }))
  .render(({ data }: { data: any }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// 2. COMPLEX TOOL - With client-side optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }: { input: any }) => {
    // Server-side database search
    return { results: [`Result for ${input.query}`] };
  })
  .clientExecute(async ({ input, ctx }: { input: any; ctx: any }) => {
    // Client-side with caching
    const cached = ctx.cache.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', { body: input });
    ctx.cache.set(input.query, result);
    return result;
  })
  .render(({ data }: { data: any }) => (
    <div>
      {data.results.map((r: string, i: number) => (
        <div key={i}>{r}</div>
      ))}
    </div>
  ))
  .build();

// 3. ULTRA-CONCISE - Single character methods
const ultraTool = aui.t('calc')
  .i(z.object({ a: z.number(), b: z.number() }))
  .e(async (i) => i.a + i.b)
  .r((d) => <span>{d}</span>)
  .b();

// 4. ONE-LINER - Minimal setup
const oneLiner = aui.do('upper', async (text: string) => text.toUpperCase());

// 5. AI-OPTIMIZED - With reliability features
const aiTool = aui.ai('fetch-data', {
  input: z.object({ url: z.string() }),
  execute: async (input) => {
    const res = await fetch(input.url);
    return res.json();
  },
  retry: 3,
  timeout: 5000,
  cache: true,
  render: (data) => <pre>{JSON.stringify(data, null, 2)}</pre>
});

// 6. FRONTEND CONTROL - AI controls the UI
const uiControl = aui.ai('ui-control', {
  input: z.object({
    action: z.enum(['show', 'hide', 'toggle', 'style']),
    selector: z.string(),
    value: z.any().optional()
  }),
  client: async (input) => {
    const element = document.querySelector(input.selector) as HTMLElement;
    if (!element) return { success: false };
    
    switch (input.action) {
      case 'show':
        element.style.display = 'block';
        break;
      case 'hide':
        element.style.display = 'none';
        break;
      case 'toggle':
        element.style.display = element.style.display === 'none' ? 'block' : 'none';
        break;
      case 'style':
        Object.assign(element.style, input.value);
        break;
    }
    return { success: true, action: input.action };
  },
  execute: async (input) => ({ success: false, action: input.action })
});

// 7. BACKEND CONTROL - AI controls server operations
const backendControl = aui.ai('backend-ops', {
  input: z.object({
    operation: z.enum(['db-query', 'api-call', 'file-op']),
    params: z.record(z.any())
  }),
  execute: async (input) => {
    switch (input.operation) {
      case 'db-query':
        // Execute database query
        return { type: 'db', result: 'Query executed' };
      case 'api-call':
        // Make external API call
        return { type: 'api', result: 'API called' };
      case 'file-op':
        // File system operation
        return { type: 'file', result: 'File operation completed' };
      default:
        return { type: 'unknown', result: 'Unknown operation' };
    }
  },
  render: (data) => (
    <div className="backend-result">
      <strong>{data.type}:</strong> {data.result}
    </div>
  )
});

// 8. STATE MANAGEMENT - AI controls application state
const stateManager = aui.ai('state-manager', {
  input: z.object({
    store: z.string(),
    action: z.enum(['get', 'set', 'update', 'delete']),
    key: z.string(),
    value: z.any().optional()
  }),
  client: async (input, ctx) => {
    const storeKey = `${input.store}:${input.key}`;
    
    switch (input.action) {
      case 'get':
        return ctx.cache.get(storeKey) || null;
      case 'set':
        ctx.cache.set(storeKey, input.value);
        return input.value;
      case 'update':
        const current = ctx.cache.get(storeKey) || {};
        const updated = { ...current, ...input.value };
        ctx.cache.set(storeKey, updated);
        return updated;
      case 'delete':
        ctx.cache.delete(storeKey);
        return null;
    }
  },
  execute: async (input) => {
    // Server-side state persistence
    return { action: input.action, key: input.key };
  }
});

// 9. BATCH TOOLS - Define multiple tools at once
const batchTools = aui.aiTools({
  navigation: {
    input: z.object({ path: z.string() }),
    client: async (input) => {
      window.history.pushState({}, '', input.path);
      return { navigated: true, path: input.path };
    },
    execute: async (input) => ({ navigated: false, path: input.path })
  },
  
  clipboard: {
    input: z.object({ text: z.string() }),
    client: async (input) => {
      await navigator.clipboard.writeText(input.text);
      return { copied: true, text: input.text };
    },
    execute: async (input) => ({ copied: false, text: input.text })
  },
  
  notification: {
    input: z.object({ 
      title: z.string(),
      body: z.string(),
      type: z.enum(['info', 'success', 'warning', 'error'])
    }),
    client: async (input) => {
      // In real app, would show toast/notification
      console.log(`[${input.type}] ${input.title}: ${input.body}`);
      return { shown: true, ...input };
    },
    execute: async (input) => ({ shown: false, ...input }),
    render: (data) => (
      <div className={`notification ${data.type}`}>
        <h4>{data.title}</h4>
        <p>{data.body}</p>
      </div>
    )
  }
});

// 10. TOOL COMPOSITION - Combine multiple tools
const composedTool = aui.ai('composed', {
  input: z.object({
    steps: z.array(z.object({
      tool: z.string(),
      params: z.any()
    }))
  }),
  execute: async (input) => {
    const results = [];
    for (const step of input.steps) {
      const tool = aui.getTool(step.tool);
      if (tool) {
        const ctx = { cache: new Map(), fetch: (url: string, options?: RequestInit) => fetch(url, options).then(r => r.json()) };
        const result = await tool.execute({ input: step.params, ctx });
        results.push({ tool: step.tool, result });
      }
    }
    return results;
  },
  render: (data) => (
    <div className="composed-results">
      {data.map((item: any, i: number) => (
        <div key={i}>
          <strong>{item.tool}:</strong> {JSON.stringify(item.result)}
        </div>
      ))}
    </div>
  )
});

// ============================================
// SHOWCASE COMPONENT
// ============================================

export function AUIShowcase() {
  const [results, setResults] = useState<any[]>([]);

  const executeExample = async (name: string, tool: any, input: any) => {
    try {
      const ctx = { 
        cache: new Map(), 
        fetch: (url: string, options?: RequestInit) => fetch(url, options).then(r => r.json())
      };
      const result = await tool.execute({ input, ctx });
      setResults(prev => [...prev, { name, input, result, success: true }]);
    } catch (error: any) {
      setResults(prev => [...prev, { name, input, error: error.message, success: false }]);
    }
  };

  return (
    <div className="aui-showcase p-8">
      <h1 className="text-3xl font-bold mb-8">Complete AUI Showcase</h1>
      
      <div className="grid gap-6">
        {/* Simple Tool Example */}
        <section className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-4">1. Simple Tool</h2>
          <pre className="bg-gray-100 p-2 mb-4 text-sm">
{`aui.tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }: { input: any }) => ({ temp: 72, city: input.city }))
  .render(({ data }: { data: any }) => <div>{data.city}: {data.temp}°</div>)
  .build()`}
          </pre>
          <button 
            onClick={() => executeExample('weather', simpleTool, { city: 'San Francisco' })}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Execute Weather Tool
          </button>
        </section>

        {/* Ultra-Concise Example */}
        <section className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-4">2. Ultra-Concise</h2>
          <pre className="bg-gray-100 p-2 mb-4 text-sm">
{`aui.t('calc')
  .i(z.object({ a: z.number(), b: z.number() }))
  .e(async (i) => i.a + i.b)
  .r((d) => <span>{d}</span>)
  .b()`}
          </pre>
          <button 
            onClick={() => executeExample('calc', ultraTool, { a: 5, b: 3 })}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Execute Calculator
          </button>
        </section>

        {/* AI-Optimized Example */}
        <section className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-4">3. AI-Optimized with Retry</h2>
          <pre className="bg-gray-100 p-2 mb-4 text-sm">
{`aui.ai('fetch-data', {
  input: z.object({ url: z.string() }),
  execute: async (input) => fetch(input.url).then(r => r.json()),
  retry: 3,
  timeout: 5000,
  cache: true
})`}
          </pre>
          <button 
            onClick={() => executeExample('fetch', aiTool, { url: 'https://api.github.com' })}
            className="bg-purple-500 text-white px-4 py-2 rounded"
          >
            Execute AI Tool
          </button>
        </section>

        {/* UI Control Example */}
        <section className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-4">4. Frontend Control</h2>
          <pre className="bg-gray-100 p-2 mb-4 text-sm">
{`aui.ai('ui-control', {
  client: async (input) => {
    // Control DOM elements
    const element = document.querySelector(input.selector);
    // ... manipulate element
  }
})`}
          </pre>
          <div id="demo-element" className="bg-yellow-200 p-4 mb-4">
            Demo Element (ID: demo-element)
          </div>
          <button 
            onClick={() => executeExample('ui-control', uiControl, { 
              action: 'toggle', 
              selector: '#demo-element' 
            })}
            className="bg-orange-500 text-white px-4 py-2 rounded"
          >
            Toggle Element
          </button>
        </section>

        {/* Results Display */}
        <section className="border p-4 rounded">
          <h2 className="text-xl font-semibold mb-4">Execution Results</h2>
          <div className="space-y-2">
            {results.map((result, i) => (
              <div key={i} className={`p-2 rounded ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
                <strong>{result.name}:</strong>
                <pre className="text-xs mt-1">
                  Input: {JSON.stringify(result.input, null, 2)}
                  {result.success ? (
                    <>Result: {JSON.stringify(result.result, null, 2)}</>
                  ) : (
                    <>Error: {result.error}</>
                  )}
                </pre>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// Export all tools for AI usage
export const allTools = {
  simpleTool,
  complexTool,
  ultraTool,
  oneLiner,
  aiTool,
  uiControl,
  backendControl,
  stateManager,
  composedTool,
  ...batchTools
};

export default AUIShowcase;