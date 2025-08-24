'use client';

import React, { useState } from 'react';
import aui, { z } from '@/lib/aui';

// Register ultra-concise tools
const tools = {
  // Simple tool - just 2 methods
  weather: aui
    .tool('weather')
    .input(z.object({ city: z.string() }))
    .execute(async ({ input }) => ({ temp: 72, city: input.city }))
    .render(({ data }) => <div className="p-4 bg-blue-50 rounded">{data.city}: {data.temp}°F</div>)
    .build(),

  // Complex tool - adds client optimization  
  search: aui
    .tool('search')
    .input(z.object({ query: z.string() }))
    .execute(async ({ input }) => {
      // Simulate search
      return [
        { id: 1, title: `Result for "${input.query}" #1`, score: 0.95 },
        { id: 2, title: `Result for "${input.query}" #2`, score: 0.87 },
        { id: 3, title: `Result for "${input.query}" #3`, score: 0.72 }
      ];
    })
    .clientExecute(async ({ input, ctx }) => {
      const cached = ctx.cache.get(input.query);
      if (cached) {
        console.log('Using cached results for:', input.query);
        return cached;
      }
      const results = await ctx.fetch('/api/tools/search', { body: input });
      ctx.cache.set(input.query, results);
      return results;
    })
    .render(({ data }) => (
      <div className="space-y-2">
        {data.map((item: any) => (
          <div key={item.id} className="p-3 bg-gray-50 rounded hover:bg-gray-100">
            <div className="font-medium">{item.title}</div>
            <div className="text-sm text-gray-500">Score: {item.score}</div>
          </div>
        ))}
      </div>
    ))
    .build(),

  // Ultra-concise one-liner
  ping: aui.do('ping', () => 'pong'),

  // Theme switcher - UI control
  theme: aui.simple(
    'theme',
    z.object({ mode: z.enum(['light', 'dark', 'auto']) }),
    async (input) => {
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', input.mode);
      }
      return { mode: input.mode, timestamp: Date.now() };
    },
    (data) => (
      <div className="p-2 bg-green-100 rounded">
        Theme set to: <strong>{data.mode}</strong>
      </div>
    )
  ),

  // Calculator with shortcuts
  calc: aui.t('calc')
    .i(z.object({ a: z.number(), b: z.number(), op: z.enum(['+', '-', '*', '/']) }))
    .e(async ({ a, b, op }) => {
      const ops = { '+': a + b, '-': a - b, '*': a * b, '/': a / b };
      return ops[op];
    })
    .r((result) => <div className="text-2xl font-mono">= {result}</div>)
    .b()
};

// Register all tools
Object.values(tools).forEach(tool => aui.register(tool));

export default function LantosDemoPage() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const executeTool = async (toolName: string, input: any) => {
    setLoading(prev => ({ ...prev, [toolName]: true }));
    try {
      const tool = tools[toolName as keyof typeof tools];
      const ctx = {
        cache: new Map(),
        fetch: async (url: string, options?: any) => {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(options?.body || {})
          });
          return response.json();
        },
        userId: 'demo-user'
      };

      const result = await tool.execute({ input, ctx });
      setResults(prev => ({ ...prev, [toolName]: result }));
    } catch (error) {
      console.error('Tool execution error:', error);
      setResults(prev => ({ ...prev, [toolName]: { error: String(error) } }));
    } finally {
      setLoading(prev => ({ ...prev, [toolName]: false }));
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">AUI Lantos Demo - Ultra Concise API</h1>
      
      <div className="space-y-8">
        {/* Weather Tool Demo */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Simple Tool - Weather (2 methods)</h2>
          <pre className="bg-gray-100 p-3 rounded mb-4 text-sm overflow-x-auto">
{`aui.tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build()`}
          </pre>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => executeTool('weather', { city: 'San Francisco' })}
              disabled={loading.weather}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {loading.weather ? 'Loading...' : 'Get Weather'}
            </button>
          </div>
          {results.weather && tools.weather.render({ data: results.weather, input: { city: 'San Francisco' } })}
        </section>

        {/* Search Tool Demo */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Complex Tool - Search (with caching)</h2>
          <pre className="bg-gray-100 p-3 rounded mb-4 text-sm overflow-x-auto">
{`aui.tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)
  .build()`}
          </pre>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => executeTool('search', { query: 'AI tools' })}
              disabled={loading.search}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              {loading.search ? 'Searching...' : 'Search'}
            </button>
          </div>
          {results.search && tools.search.render({ data: results.search, input: { query: 'AI tools' } })}
        </section>

        {/* Theme Switcher Demo */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">UI Control - Theme Switcher</h2>
          <pre className="bg-gray-100 p-3 rounded mb-4 text-sm overflow-x-auto">
{`aui.simple('theme',
  z.object({ mode: z.enum(['light', 'dark', 'auto']) }),
  async (input) => { /* switch theme */ },
  (data) => <div>Theme: {data.mode}</div>
)`}
          </pre>
          <div className="flex gap-2 mb-4">
            {['light', 'dark', 'auto'].map(mode => (
              <button
                key={mode}
                onClick={() => executeTool('theme', { mode })}
                disabled={loading.theme}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 capitalize"
              >
                {mode}
              </button>
            ))}
          </div>
          {results.theme && tools.theme.render({ data: results.theme, input: { mode: 'light' } })}
        </section>

        {/* Calculator Demo */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Ultra-Concise with Shortcuts</h2>
          <pre className="bg-gray-100 p-3 rounded mb-4 text-sm overflow-x-auto">
{`aui.t('calc')  // t = tool
  .i(z.object({ a: z.number(), b: z.number(), op: z.enum(['+','-','*','/']) }))  // i = input
  .e(async ({ a, b, op }) => /* calculate */)  // e = execute
  .r((result) => <div>= {result}</div>)  // r = render
  .b()  // b = build`}
          </pre>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => executeTool('calc', { a: 10, b: 5, op: '+' })}
              disabled={loading.calc}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
            >
              10 + 5
            </button>
            <button
              onClick={() => executeTool('calc', { a: 20, b: 4, op: '/' })}
              disabled={loading.calc}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
            >
              20 / 4
            </button>
          </div>
          {results.calc && tools.calc.render({ data: results.calc, input: {} })}
        </section>

        {/* One-liner Demo */}
        <section className="border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">One-liner Tool</h2>
          <pre className="bg-gray-100 p-3 rounded mb-4 text-sm overflow-x-auto">
{`aui.do('ping', () => 'pong')`}
          </pre>
          <div className="flex gap-2 mb-4">
            <button
              onClick={async () => {
                const result = await tools.ping.execute({ input: {}, ctx: {} as any });
                setResults(prev => ({ ...prev, ping: result }));
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Ping
            </button>
          </div>
          {results.ping && (
            <div className="p-3 bg-green-50 rounded font-mono">
              Response: {results.ping}
            </div>
          )}
        </section>
      </div>

      <div className="mt-12 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Key Features</h2>
        <ul className="space-y-2 text-sm">
          <li>✓ <strong>Ultra-concise API:</strong> 2 methods for simple tools (execute + render)</li>
          <li>✓ <strong>Client optimization:</strong> Optional client-side execution with caching</li>
          <li>✓ <strong>Type safety:</strong> Full TypeScript support with Zod schemas</li>
          <li>✓ <strong>AI-ready:</strong> Built for LLM tool calling</li>
          <li>✓ <strong>Shortcuts:</strong> t(), i(), e(), r(), b() for even more concise code</li>
          <li>✓ <strong>One-liners:</strong> aui.do() for simplest tools</li>
        </ul>
      </div>
    </div>
  );
}