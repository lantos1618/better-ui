'use client';

import React from 'react';
import aui from '../index';
import { z } from 'zod';

// ============================================
// BACKEND CONTROL TOOLS
// ============================================

// Database query tool - AI can query your database
const queryDatabaseTool = aui
  .tool('queryDatabase')
  .input(z.object({ 
    table: z.string(),
    query: z.object({
      where: z.record(z.any()).optional(),
      limit: z.number().optional(),
      orderBy: z.string().optional()
    })
  }))
  .execute(async ({ input }) => {
    // Server-side database query (would connect to your actual DB)
    console.log('AI executing database query:', input);
    return {
      rows: [
        { id: 1, name: 'User 1', email: 'user1@example.com' },
        { id: 2, name: 'User 2', email: 'user2@example.com' }
      ],
      count: 2
    };
  })
  .render(({ data }) => (
    <div className="p-2 bg-gray-100 rounded">
      <h4 className="font-bold">Database Results</h4>
      <pre className="text-sm">{JSON.stringify(data.rows, null, 2)}</pre>
      <p className="text-xs mt-2">Found {data.count} records</p>
    </div>
  ));

// API endpoint control - AI can call your API endpoints
const callAPITool = aui
  .tool('callAPI')
  .input(z.object({
    endpoint: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
    body: z.any().optional(),
    headers: z.record(z.string()).optional()
  }))
  .execute(async ({ input }) => {
    // Server-side API call
    const response = await fetch(input.endpoint, {
      method: input.method,
      headers: input.headers,
      body: input.body ? JSON.stringify(input.body) : undefined
    });
    return await response.json();
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side with caching
    const cacheKey = `${input.method}:${input.endpoint}`;
    if (input.method === 'GET') {
      const cached = ctx.cache.get(cacheKey);
      if (cached) return cached;
    }
    
    const result = await ctx.fetch(input.endpoint, {
      method: input.method,
      headers: input.headers,
      body: input.body ? JSON.stringify(input.body) : undefined
    }).then(r => r.json());
    
    if (input.method === 'GET') {
      ctx.cache.set(cacheKey, result);
    }
    
    return result;
  })
  .render(({ data }) => (
    <div className="p-2 bg-blue-50 rounded">
      <h4 className="font-bold">API Response</h4>
      <pre className="text-sm">{JSON.stringify(data, null, 2)}</pre>
    </div>
  ));

// ============================================
// FRONTEND CONTROL TOOLS
// ============================================

// Update DOM - AI can modify page content
const updateDOMTool = aui
  .tool('updateDOM')
  .input(z.object({
    selector: z.string(),
    action: z.enum(['setText', 'setHTML', 'addClass', 'removeClass', 'setStyle', 'setAttribute']),
    value: z.string()
  }))
  .clientExecute(async ({ input }) => {
    const element = document.querySelector(input.selector);
    if (!element) throw new Error(`Element not found: ${input.selector}`);
    
    switch (input.action) {
      case 'setText':
        element.textContent = input.value;
        break;
      case 'setHTML':
        element.innerHTML = input.value;
        break;
      case 'addClass':
        element.classList.add(input.value);
        break;
      case 'removeClass':
        element.classList.remove(input.value);
        break;
      case 'setStyle':
        Object.assign(element as HTMLElement, { style: input.value });
        break;
      case 'setAttribute':
        const [attr, val] = input.value.split('=');
        element.setAttribute(attr, val);
        break;
    }
    
    return { success: true, selector: input.selector, action: input.action };
  })
  .render(({ data }) => (
    <div className="p-2 bg-green-50 rounded">
      <p className="text-sm">✅ DOM updated: {data.action} on {data.selector}</p>
    </div>
  ));

// Form submission - AI can submit forms
const submitFormTool = aui
  .tool('submitForm')
  .input(z.object({
    formId: z.string(),
    data: z.record(z.any())
  }))
  .clientExecute(async ({ input }) => {
    const form = document.getElementById(input.formId) as HTMLFormElement;
    if (!form) throw new Error(`Form not found: ${input.formId}`);
    
    // Set form values
    Object.entries(input.data).forEach(([name, value]) => {
      const field = form.elements.namedItem(name) as HTMLInputElement;
      if (field) field.value = String(value);
    });
    
    // Trigger submit event
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submitEvent);
    
    return { submitted: true, formId: input.formId, data: input.data };
  })
  .render(({ data }) => (
    <div className="p-2 bg-purple-50 rounded">
      <p className="text-sm">📝 Form submitted: {data.formId}</impede>
    </div>
  ));

// Navigate - AI can navigate the app
const navigateTool = aui
  .tool('navigate')
  .input(z.object({
    path: z.string(),
    params: z.record(z.string()).optional()
  }))
  .clientExecute(async ({ input }) => {
    const url = new URL(input.path, window.location.origin);
    if (input.params) {
      Object.entries(input.params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    
    // For Next.js navigation
    if (typeof window !== 'undefined' && (window as any).next?.router) {
      await (window as any).next.router.push(url.pathname + url.search);
    } else {
      window.location.href = url.toString();
    }
    
    return { navigatedTo: url.pathname, params: input.params };
  })
  .render(({ data }) => (
    <div className="p-2 bg-indigo-50 rounded">
      <p className="text-sm">🔗 Navigated to: {data.navigatedTo}</p>
    </div>
  ));

// Local storage - AI can persist data
const localStorageTool = aui
  .tool('localStorage')
  .input(z.object({
    action: z.enum(['get', 'set', 'remove', 'clear']),
    key: z.string().optional(),
    value: z.any().optional()
  }))
  .clientExecute(async ({ input }) => {
    switch (input.action) {
      case 'get':
        return { value: localStorage.getItem(input.key!) };
      case 'set':
        localStorage.setItem(input.key!, JSON.stringify(input.value));
        return { stored: true, key: input.key };
      case 'remove':
        localStorage.removeItem(input.key!);
        return { removed: true, key: input.key };
      case 'clear':
        localStorage.clear();
        return { cleared: true };
      default:
        throw new Error(`Unknown action: ${input.action}`);
    }
  })
  .render(({ data }) => (
    <div className="p-2 bg-yellow-50 rounded">
      <p className="text-sm">💾 Storage: {JSON.stringify(data)}</p>
    </div>
  ));

// ============================================
// DEMO COMPONENT
// ============================================

export function AIControlDemo() {
  const [results, setResults] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const executeAICommand = async (tool: any, input: any) => {
    setLoading(true);
    try {
      const result = await tool.run(input);
      setResults(prev => [...prev, { tool: tool.name, result, timestamp: new Date() }]);
    } catch (error) {
      console.error('AI command failed:', error);
      setResults(prev => [...prev, { tool: tool.name, error: String(error), timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">AI Control Demo - Frontend & Backend</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backend Control Examples */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Backend Control</h2>
          
          <div className="space-y-3">
            <button
              onClick={() => executeAICommand(queryDatabaseTool, {
                table: 'users',
                query: { limit: 10, orderBy: 'created_at' }
              })}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={loading}
            >
              AI: Query Database
            </button>
            
            <button
              onClick={() => executeAICommand(callAPITool, {
                endpoint: '/api/health',
                method: 'GET'
              })}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={loading}
            >
              AI: Call API Endpoint
            </button>
          </div>
        </div>
        
        {/* Frontend Control Examples */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">Frontend Control</h2>
          
          <div className="space-y-3">
            <button
              onClick={() => executeAICommand(updateDOMTool, {
                selector: 'h1',
                action: 'setText',
                value: 'AI Modified This Title!'
              })}
              className="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              disabled={loading}
            >
              AI: Update Page Title
            </button>
            
            <button
              onClick={() => executeAICommand(localStorageTool, {
                action: 'set',
                key: 'ai_data',
                value: { message: 'AI was here', timestamp: Date.now() }
              })}
              className="w-full px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              disabled={loading}
            >
              AI: Store Data Locally
            </button>
            
            <button
              onClick={() => executeAICommand(navigateTool, {
                path: '/',
                params: { ai_action: 'demo' }
              })}
              className="w-full px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
              disabled={loading}
            >
              AI: Navigate Home
            </button>
          </div>
        </div>
      </div>
      
      {/* Results Display */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">AI Execution Results</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {results.map((item, idx) => (
            <div key={idx} className="border rounded p-3">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span className="font-medium">{item.tool}</span>
                <span>{item.timestamp.toLocaleTimeString()}</span>
              </div>
              {item.error ? (
                <div className="text-red-600 text-sm">Error: {item.error}</div>
              ) : (
                <pre className="text-sm bg-gray-50 p-2 rounded overflow-x-auto">
                  {JSON.stringify(item.result, null, 2)}
                </pre>
              )}
            </div>
          ))}
          {results.length === 0 && (
            <p className="text-gray-500 text-center py-4">No AI commands executed yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Export all tools for AI integration
export const aiControlTools = {
  queryDatabaseTool,
  callAPITool,
  updateDOMTool,
  submitFormTool,
  navigateTool,
  localStorageTool
};