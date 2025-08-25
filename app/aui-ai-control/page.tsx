'use client';

import { useState } from 'react';
import { z } from 'zod';
import aui from '@/lib/aui';
import { useAUITool } from '@/lib/aui/hooks/useAUITool';

// Define all AI-controllable tools inline for clarity
const tools = {
  // Simple weather tool - 2 methods minimum
  weather: aui
    .tool('weather')
    .input(z.object({ city: z.string() }))
    .execute(async ({ input }) => ({ 
      temp: Math.floor(50 + Math.random() * 50), 
      city: input.city,
      conditions: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)]
    }))
    .render(({ data }) => (
      <div className="p-4 bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-lg">
        <h3 className="text-xl font-bold">{data.city}</h3>
        <p className="text-3xl">{data.temp}°F</p>
        <p className="text-sm opacity-90">{data.conditions}</p>
      </div>
    )),

  // Database query tool - AI can query data
  query: aui
    .tool('query')
    .input(z.object({ 
      sql: z.string(),
      params: z.array(z.any()).optional() 
    }))
    .execute(async ({ input }) => {
      // Simulate database query
      console.log('Executing query:', input.sql);
      return {
        rows: [
          { id: 1, name: 'John', role: 'Admin' },
          { id: 2, name: 'Jane', role: 'User' }
        ],
        query: input.sql
      };
    })
    .render(({ data }) => (
      <div className="p-3 bg-gray-900 text-green-400 rounded font-mono text-sm">
        <div className="text-gray-500 mb-2">Query: {data.query}</div>
        <table className="w-full">
          <tbody>
            {data.rows.map((row: any, i: number) => (
              <tr key={i}>
                {Object.entries(row).map(([k, v]) => (
                  <td key={k} className="px-2">{v as string}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )),

  // UI State control - AI can manipulate UI
  uiState: aui
    .tool('ui-state')
    .input(z.object({
      component: z.string(),
      state: z.record(z.any())
    }))
    .execute(async ({ input }) => input)
    .clientExecute(async ({ input, ctx }) => {
      // Client-side state update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ui-state-change', { detail: input }));
      }
      return input;
    })
    .render(({ data }) => (
      <div className="p-3 bg-purple-50 border border-purple-200 rounded">
        <div className="text-sm font-semibold text-purple-700">UI State Updated</div>
        <div className="text-xs text-purple-600 mt-1">
          Component: {data.component}
        </div>
        <pre className="text-xs mt-2 text-purple-500">
          {JSON.stringify(data.state, null, 2)}
        </pre>
      </div>
    )),

  // API call tool - AI can call APIs
  api: aui
    .tool('api')
    .input(z.object({
      endpoint: z.string(),
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('GET'),
      body: z.any().optional()
    }))
    .execute(async ({ input, ctx }) => {
      // Simulate API call
      console.log(`API ${input.method} ${input.endpoint}`);
      return {
        status: 200,
        data: { message: 'Success', endpoint: input.endpoint }
      };
    })
    .clientExecute(async ({ input, ctx }) => {
      // Use cache for GET requests
      if (input.method === 'GET') {
        const cached = ctx.cache.get(input.endpoint);
        if (cached) return cached;
      }
      
      const result = await ctx.fetch(input.endpoint, {
        method: input.method,
        body: input.body ? JSON.stringify(input.body) : undefined
      });
      
      const data = await result.json();
      if (input.method === 'GET') {
        ctx.cache.set(input.endpoint, data);
      }
      return data;
    })
    .render(({ data, loading }) => (
      <div className="p-3 bg-green-50 border border-green-200 rounded">
        {loading ? (
          <div className="animate-pulse">Calling API...</div>
        ) : (
          <>
            <div className="text-sm font-semibold text-green-700">API Response</div>
            <pre className="text-xs mt-2 text-green-600">
              {JSON.stringify(data, null, 2)}
            </pre>
          </>
        )}
      </div>
    )),

  // Form handler - AI can submit forms
  form: aui
    .tool('form')
    .input(z.object({
      fields: z.record(z.any()),
      action: z.string()
    }))
    .execute(async ({ input }) => {
      console.log('Form submission:', input);
      return { 
        success: true, 
        message: `Form "${input.action}" submitted successfully`,
        data: input.fields
      };
    })
    .render(({ data }) => (
      <div className="p-4 bg-green-100 border border-green-300 rounded">
        <div className="flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <span className="font-semibold text-green-700">{data.message}</span>
        </div>
        <div className="text-sm text-green-600 mt-2">
          Submitted: {Object.keys(data.data).join(', ')}
        </div>
      </div>
    )),

  // Notification tool - AI can show notifications  
  notify: aui
    .tool('notify')
    .input(z.object({
      message: z.string(),
      type: z.enum(['info', 'success', 'warning', 'error']).default('info')
    }))
    .execute(async ({ input }) => input)
    .render(({ data }) => {
      const colors = {
        info: 'bg-blue-500',
        success: 'bg-green-500',
        warning: 'bg-yellow-500',
        error: 'bg-red-500'
      };
      return (
        <div className={`${colors[data.type]} text-white px-4 py-2 rounded shadow-lg`}>
          {data.message}
        </div>
      );
    })
};

export default function AUIAIControlDemo() {
  const [results, setResults] = useState<any[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');

  // Simulate AI executing tools
  const simulateAIControl = async () => {
    const examples = [
      { tool: 'weather', input: { city: 'Tokyo' } },
      { tool: 'query', input: { sql: 'SELECT * FROM users LIMIT 2' } },
      { tool: 'api', input: { endpoint: '/api/status', method: 'GET' as const } },
      { tool: 'notify', input: { message: 'AI task completed!', type: 'success' as const } }
    ];

    const newResults = [];
    for (const example of examples) {
      const tool = tools[example.tool as keyof typeof tools];
      const ctx = aui.createContext();
      const result = await tool.run(example.input as any, ctx);
      newResults.push({
        tool: example.tool,
        input: example.input,
        output: result,
        renderer: tool.renderer
      });
    }
    setResults(newResults);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AUI - AI Control System
          </h1>
          <p className="text-lg text-gray-600">
            Concise API for AI to control both frontend and backend in Next.js
          </p>
        </div>

        {/* Code Examples */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Simple Tool (2 methods)</h2>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded text-sm overflow-x-auto">
              <code>{`const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: 72, 
    city: input.city 
  }))
  .render(({ data }) => (
    <div>{data.city}: {data.temp}°</div>
  ))`}</code>
            </pre>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Complex Tool (with caching)</h2>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded text-sm overflow-x-auto">
              <code>{`const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => 
    db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/search');
  })
  .render(({ data }) => 
    <Results items={data} />)`}</code>
            </pre>
          </div>
        </div>

        {/* AI Control Interface */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">AI Control Interface</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Prompt (simulated)
              </label>
              <textarea
                className="w-full p-3 border rounded-lg"
                rows={3}
                placeholder="Example: Get weather for Tokyo, query the database, and show a notification"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
            </div>
            <button
              onClick={simulateAIControl}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Simulate AI Control
            </button>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">AI Execution Results</h2>
            <div className="space-y-4">
              {results.map((result, i) => (
                <div key={i} className="border-l-4 border-blue-500 pl-4">
                  <div className="text-sm font-semibold text-gray-600 mb-1">
                    Tool: {result.tool}
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    Input: {JSON.stringify(result.input)}
                  </div>
                  {result.renderer && result.renderer({ data: result.output } as any)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold text-lg mb-2">🎯 Concise API</h3>
            <p className="text-sm text-gray-600">
              Define tools in just 2-4 method calls. No build step, no boilerplate.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold text-lg mb-2">🔄 Client/Server</h3>
            <p className="text-sm text-gray-600">
              Execute on server by default, add client optimization when needed.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="font-semibold text-lg mb-2">🤖 AI Ready</h3>
            <p className="text-sm text-gray-600">
              Tools are designed for AI agents to discover and execute safely.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}