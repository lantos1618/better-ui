'use client';

import { useState } from 'react';
import { aui, z } from '@/lib/aui/lantos-aui';

// Simple tool - just 2 methods (input + execute)
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ 
    temp: Math.floor(60 + Math.random() * 30), 
    city: input.city,
    condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)]
  }));

// Tool with rendering
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulate search
    await new Promise(r => setTimeout(r, 500));
    return {
      results: [
        { id: 1, title: `Result for "${input.query}" #1`, score: 0.95 },
        { id: 2, title: `Result for "${input.query}" #2`, score: 0.87 },
        { id: 3, title: `Result for "${input.query}" #3`, score: 0.73 },
      ]
    };
  })
  .render(({ data }) => (
    <div className="space-y-2">
      {data.results.map(r => (
        <div key={r.id} className="p-2 bg-gray-50 rounded">
          <span className="font-medium">{r.title}</span>
          <span className="text-sm text-gray-500 ml-2">Score: {r.score}</span>
        </div>
      ))}
    </div>
  ));

// Complex tool with client-side caching
const complexTool = aui
  .tool('database')
  .input(z.object({ 
    table: z.string(),
    query: z.string().optional() 
  }))
  .execute(async ({ input }) => {
    // Server-side database query simulation
    await new Promise(r => setTimeout(r, 1000));
    return {
      table: input.table,
      rowCount: Math.floor(Math.random() * 1000),
      data: [`Row from ${input.table}`, `Another row`, `Third row`]
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side caching
    const cacheKey = `db:${input.table}:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    if (cached) {
      console.log('Cache hit for', cacheKey);
      return cached;
    }
    
    // Fallback to server
    const result = await ctx.fetch('/api/tools/database', { 
      method: 'POST',
      body: JSON.stringify(input) 
    }).then(r => r.json()).catch(() => {
      // Fallback to execute if API not available
      return complexTool.run(input);
    });
    
    ctx.cache.set(cacheKey, result);
    return result;
  })
  .render(({ data }) => (
    <div className="p-4 bg-blue-50 rounded">
      <h3 className="font-bold">Table: {data.table}</h3>
      <p className="text-sm text-gray-600">Rows: {data.rowCount}</p>
      <ul className="mt-2">
        {data.data.map((row, i) => (
          <li key={i} className="text-sm">{row}</li>
        ))}
      </ul>
    </div>
  ));

// Shorthand examples
const quickTool = aui.do('ping', () => ({ pong: Date.now() }));

const calcTool = aui.doWith(
  'calc',
  z.object({ a: z.number(), b: z.number(), op: z.enum(['+', '-', '*', '/']) }),
  ({ a, b, op }) => {
    const ops = { '+': a + b, '-': a - b, '*': a * b, '/': a / b };
    return { result: ops[op] };
  }
);

const aiTool = aui.ai('smart-search', {
  input: z.object({ prompt: z.string() }),
  execute: async ({ input }) => {
    // AI-powered search with built-in retry
    await new Promise(r => setTimeout(r, 300));
    if (Math.random() > 0.7) throw new Error('Simulated failure for retry demo');
    return { 
      answer: `AI response for: ${input.prompt}`,
      confidence: Math.random() 
    };
  },
  render: ({ data }) => (
    <div className="p-3 bg-green-50 rounded">
      <p>{data.answer}</p>
      <p className="text-xs text-gray-500">Confidence: {(data.confidence * 100).toFixed(1)}%</p>
    </div>
  ),
  retry: 3,
  cache: true
});

export default function LantosAUIFullDemo() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const runTool = async (toolName: string, input: any) => {
    setLoading(prev => ({ ...prev, [toolName]: true }));
    try {
      const tool = aui.get(toolName);
      if (!tool) throw new Error(`Tool ${toolName} not found`);
      
      const result = await tool.run(input, aui.createContext());
      setResults(prev => ({ ...prev, [toolName]: result }));
    } catch (error) {
      console.error(`Error running ${toolName}:`, error);
      setResults(prev => ({ ...prev, [toolName]: { error: String(error) } }));
    } finally {
      setLoading(prev => ({ ...prev, [toolName]: false }));
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Lantos AUI - Ultra-Concise AI Tool API</h1>
      
      <div className="space-y-8">
        {/* Simple Tool Example */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Simple Tool (2 methods)</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm mb-4 overflow-x-auto">
{`const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))`}
          </pre>
          <button
            onClick={() => runTool('weather', { city: 'San Francisco' })}
            disabled={loading.weather}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading.weather ? 'Loading...' : 'Get Weather'}
          </button>
          {results.weather && (
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <pre>{JSON.stringify(results.weather, null, 2)}</pre>
            </div>
          )}
        </section>

        {/* Tool with Rendering */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Tool with Render</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm mb-4 overflow-x-auto">
{`const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .render(({ data }) => <SearchResults results={data} />)`}
          </pre>
          <button
            onClick={() => runTool('search', { query: 'AI tools' })}
            disabled={loading.search}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading.search ? 'Searching...' : 'Search'}
          </button>
          {results.search && (
            <div className="mt-4">
              {searchTool.renderResult(results.search) || (
                <pre>{JSON.stringify(results.search, null, 2)}</pre>
              )}
            </div>
          )}
        </section>

        {/* Complex Tool with Client Execution */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Complex Tool (Client + Server)</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm mb-4 overflow-x-auto">
{`const complexTool = aui
  .tool('database')
  .input(z.object({ table: z.string() }))
  .execute(async ({ input }) => db.query(input))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.table);
    return cached || ctx.fetch('/api/db', { body: input });
  })
  .render(({ data }) => <DatabaseResults data={data} />)`}
          </pre>
          <button
            onClick={() => runTool('database', { table: 'users' })}
            disabled={loading.database}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading.database ? 'Querying...' : 'Query Database'}
          </button>
          {results.database && (
            <div className="mt-4">
              {complexTool.renderResult(results.database) || (
                <pre>{JSON.stringify(results.database, null, 2)}</pre>
              )}
            </div>
          )}
        </section>

        {/* Shorthand Methods */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Shorthand Methods</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">aui.do() - Simple no-input tool</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm mb-2">
{`aui.do('ping', () => ({ pong: Date.now() }))`}
              </pre>
              <button
                onClick={() => runTool('ping', undefined)}
                disabled={loading.ping}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm"
              >
                Ping
              </button>
              {results.ping && (
                <pre className="mt-2 text-sm">{JSON.stringify(results.ping)}</pre>
              )}
            </div>

            <div>
              <h3 className="font-medium mb-2">aui.doWith() - One-liner with input</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm mb-2">
{`aui.doWith('calc', schema, ({ a, b, op }) => ops[op])`}
              </pre>
              <button
                onClick={() => runTool('calc', { a: 10, b: 5, op: '+' })}
                disabled={loading.calc}
                className="px-3 py-1 bg-green-500 text-white rounded text-sm"
              >
                Calculate 10 + 5
              </button>
              {results.calc && (
                <pre className="mt-2 text-sm">{JSON.stringify(results.calc)}</pre>
              )}
            </div>

            <div>
              <h3 className="font-medium mb-2">aui.ai() - AI-optimized with retry & cache</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm mb-2">
{`aui.ai('smart-search', {
  input: schema,
  execute: handler,
  retry: 3,
  cache: true
})`}
              </pre>
              <button
                onClick={() => runTool('smart-search', { prompt: 'What is AUI?' })}
                disabled={loading['smart-search']}
                className="px-3 py-1 bg-purple-500 text-white rounded text-sm"
              >
                AI Search
              </button>
              {results['smart-search'] && (
                <div className="mt-2">
                  {aiTool.renderResult(results['smart-search']) || (
                    <pre className="text-sm">{JSON.stringify(results['smart-search'])}</pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Tool List */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Registered Tools</h2>
          <div className="grid grid-cols-2 gap-4">
            {aui.getToolNames().map(name => (
              <div key={name} className="p-3 bg-gray-50 rounded">
                <code className="text-sm font-mono">{name}</code>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}