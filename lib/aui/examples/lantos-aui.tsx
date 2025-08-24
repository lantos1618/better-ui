'use client';

import { aui } from '../index';
import { z } from 'zod';
import React from 'react';

// Simple tool - just 2 methods (execute + render)
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Server-side database search
    const results = await new Promise<string[]>(resolve => 
      setTimeout(() => resolve([`Result for: ${input.query}`]), 100)
    );
    return { query: input.query, results };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache?.get(input.query);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/tools/search', { 
      method: 'POST',
      body: JSON.stringify(input) 
    });
    ctx.cache?.set(input.query, result);
    return result;
  })
  .render(({ data }) => (
    <div className="p-4 border rounded">
      <h3 className="font-bold">Search: {data.query}</h3>
      <ul>
        {data.results.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
    </div>
  ))
  .build();

// Even simpler - using aui.simple()
const pingTool = aui.simple(
  'ping',
  z.object({ message: z.string() }),
  async ({ message }) => ({ response: `Pong: ${message}` }),
  ({ response }) => <div>{response}</div>
);

// Ultra-concise one-liner
const timestampTool = aui.do('timestamp', () => ({ time: new Date().toISOString() }));

// AI-optimized tool with retry and caching
const aiTool = aui.ai('smart-search', {
  input: z.object({ query: z.string() }),
  execute: async ({ query }) => {
    // Simulated AI processing
    return { answer: `AI response for: ${query}` };
  },
  render: ({ answer }) => <div className="text-green-600">{answer}</div>,
  retry: 3,
  cache: true,
  timeout: 5000
});

// Batch definition for multiple related tools
const uiTools = aui.defineTools({
  toggleTheme: {
    input: z.object({ theme: z.enum(['light', 'dark']) }),
    execute: async ({ theme }) => ({ newTheme: theme }),
    render: ({ newTheme }) => <div>Theme changed to: {newTheme}</div>
  },
  showModal: {
    input: z.object({ title: z.string(), content: z.string() }),
    execute: async ({ title, content }) => ({ title, content, shown: true }),
    render: ({ title, content }) => (
      <div className="p-4 bg-white shadow-lg rounded">
        <h2 className="text-xl font-bold">{title}</h2>
        <p>{content}</p>
      </div>
    )
  }
});

// Export all tools for demo
export const lantosTools = {
  simpleTool,
  complexTool,
  pingTool,
  timestampTool,
  aiTool,
  ...uiTools
};

// Demo component
export function LantosAUIDemo() {
  const [results, setResults] = React.useState<any[]>([]);

  const runTool = async (tool: any, input: any) => {
    const result = await tool.execute({ input });
    setResults(prev => [...prev, { tool: tool.name, data: result }]);
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold">Lantos AUI Demo</h1>
      
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Simple Tool Pattern</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
{`const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();`}
        </pre>
        <button 
          onClick={() => runTool(simpleTool, { city: 'San Francisco' })}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Run Weather Tool
        </button>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Complex Tool with Client Optimization</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
{`const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)
  .build();`}
        </pre>
        <button 
          onClick={() => runTool(complexTool, { query: 'test query' })}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Run Search Tool
        </button>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Ultra-Concise Patterns</h2>
        <div className="space-y-2">
          <button 
            onClick={() => runTool(pingTool, { message: 'Hello!' })}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Run Ping (aui.simple)
          </button>
          <button 
            onClick={async () => {
              const result = await timestampTool.execute({ input: {} });
              setResults(prev => [...prev, { tool: 'timestamp', data: result }]);
            }}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
          >
            Run Timestamp (aui.do)
          </button>
          <button 
            onClick={() => runTool(aiTool, { query: 'What is AUI?' })}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Run AI Tool (aui.ai)
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Results</h2>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {results.map((result, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded">
              <div className="font-semibold">{result.tool}</div>
              <pre className="text-sm mt-1">{JSON.stringify(result.data, null, 2)}</pre>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default LantosAUIDemo;