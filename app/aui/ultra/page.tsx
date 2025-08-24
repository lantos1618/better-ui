'use client';

import { useState } from 'react';
import aui from '@/lib/aui';
import { z } from 'zod';

// Define ultra-concise tools
const tools = {
  // Simple weather tool - 3 lines
  weather: aui.simple(
    'weather',
    z.object({ city: z.string() }),
    async (input) => ({ temp: Math.round(60 + Math.random() * 30), city: input.city }),
    (data) => <div className="p-4 bg-blue-100 rounded">{data.city}: {data.temp}°F</div>
  ),

  // Search tool with client caching
  search: aui.tool('search')
    .input(z.object({ query: z.string() }))
    .execute(async ({ input }) => ({
      results: [
        `Result 1 for "${input.query}"`,
        `Result 2 for "${input.query}"`,
        `Result 3 for "${input.query}"`
      ]
    }))
    .clientExecute(async ({ input, ctx }) => {
      const cached = ctx.cache.get(input.query);
      if (cached) return cached;
      const result = await ctx.fetch('/api/aui/search', { body: input });
      ctx.cache.set(input.query, result);
      return result;
    })
    .render(({ data }) => (
      <ul className="list-disc pl-5">
        {data.results.map((r, i) => <li key={i}>{r}</li>)}
      </ul>
    ))
    .build(),

  // Calculator with inline definition
  calc: aui.tool('calc').do({
    input: z.object({ 
      a: z.number(), 
      b: z.number(), 
      op: z.enum(['+', '-', '*', '/']) 
    }),
    execute: (input) => {
      const ops = {
        '+': (a: number, b: number) => a + b,
        '-': (a: number, b: number) => a - b,
        '*': (a: number, b: number) => a * b,
        '/': (a: number, b: number) => a / b,
      };
      return ops[input.op](input.a, input.b);
    },
    render: (result) => (
      <div className="text-2xl font-bold text-green-600">
        = {result}
      </div>
    )
  }),

  // Stock price tool
  stock: aui.simple(
    'stock',
    z.object({ ticker: z.string().toUpperCase() }),
    async (input) => ({
      ticker: input.ticker,
      price: (100 + Math.random() * 400).toFixed(2),
      change: (Math.random() * 10 - 5).toFixed(2)
    }),
    (data) => (
      <div className="p-4 border rounded">
        <div className="font-bold">{data.ticker}</div>
        <div className="text-xl">${data.price}</div>
        <div className={parseFloat(data.change) >= 0 ? 'text-green-500' : 'text-red-500'}>
          {parseFloat(data.change) >= 0 ? '+' : ''}{data.change}%
        </div>
      </div>
    )
  )
};

export default function UltraAUIDemo() {
  const [results, setResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const executeTool = async (toolName: string, input: any) => {
    setLoading(prev => ({ ...prev, [toolName]: true }));
    try {
      const tool = tools[toolName as keyof typeof tools];
      const result = await tool.execute({ 
        input, 
        ctx: { 
          cache: new Map(), 
          fetch: async (url: string, opts?: any) => {
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(opts?.body)
            });
            return res.json();
          },
          userId: 'demo-user'
        } 
      });
      setResults(prev => ({ ...prev, [toolName]: result }));
    } catch (error) {
      console.error(`Error executing ${toolName}:`, error);
      setResults(prev => ({ ...prev, [toolName]: { error: String(error) } }));
    } finally {
      setLoading(prev => ({ ...prev, [toolName]: false }));
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-8">Ultra-Concise AUI Demo</h1>
      
      <div className="space-y-8">
        {/* Weather Tool */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Weather Tool</h2>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => executeTool('weather', { city: 'San Francisco' })}
              disabled={loading.weather}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Get SF Weather
            </button>
            <button
              onClick={() => executeTool('weather', { city: 'New York' })}
              disabled={loading.weather}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Get NY Weather
            </button>
          </div>
          {results.weather && tools.weather.render({ data: results.weather, input: {} })}
        </section>

        {/* Search Tool */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Search Tool (with caching)</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              id="searchInput"
              placeholder="Enter search query..."
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={() => {
                const input = (document.getElementById('searchInput') as HTMLInputElement).value;
                if (input) executeTool('search', { query: input });
              }}
              disabled={loading.search}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Search
            </button>
          </div>
          {results.search && tools.search.render({ data: results.search, input: {} })}
        </section>

        {/* Calculator Tool */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Calculator Tool</h2>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <input
              type="number"
              id="calcA"
              placeholder="A"
              className="px-3 py-2 border rounded"
            />
            <select id="calcOp" className="px-3 py-2 border rounded">
              <option value="+">+</option>
              <option value="-">-</option>
              <option value="*">×</option>
              <option value="/">÷</option>
            </select>
            <input
              type="number"
              id="calcB"
              placeholder="B"
              className="px-3 py-2 border rounded"
            />
            <button
              onClick={() => {
                const a = parseFloat((document.getElementById('calcA') as HTMLInputElement).value);
                const b = parseFloat((document.getElementById('calcB') as HTMLInputElement).value);
                const op = (document.getElementById('calcOp') as HTMLSelectElement).value;
                if (!isNaN(a) && !isNaN(b)) {
                  executeTool('calc', { a, b, op });
                }
              }}
              disabled={loading.calc}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              Calculate
            </button>
          </div>
          {results.calc !== undefined && tools.calc.render({ data: results.calc, input: {} })}
        </section>

        {/* Stock Tool */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Stock Price Tool</h2>
          <div className="flex gap-2 mb-4">
            {['AAPL', 'GOOGL', 'MSFT', 'TSLA'].map(ticker => (
              <button
                key={ticker}
                onClick={() => executeTool('stock', { ticker })}
                disabled={loading.stock}
                className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
              >
                {ticker}
              </button>
            ))}
          </div>
          {results.stock && tools.stock.render({ data: results.stock, input: {} })}
        </section>
      </div>

      {/* Code Example */}
      <section className="mt-12 border rounded-lg p-6 bg-gray-50">
        <h2 className="text-2xl font-semibold mb-4">Ultra-Concise Code Example</h2>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto">
          <code>{`// Define a tool in just 4 lines
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// Or even more concise with helper
const searchTool = aui.simple(
  'search',
  z.object({ query: z.string() }),
  async (input) => db.search(input.query),
  (data) => <SearchResults results={data} />
);

// With client optimization
const dataTool = aui
  .tool('data')
  .input(z.object({ id: z.string() }))
  .execute(async ({ input }) => db.get(input.id))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.id);
    return cached || ctx.fetch('/api/data', { body: input });
  })
  .render(({ data }) => <DataView {...data} />)
  .build();`}</code>
        </pre>
      </section>
    </div>
  );
}