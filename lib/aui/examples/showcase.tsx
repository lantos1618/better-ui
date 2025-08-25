'use client';

import { useState } from 'react';
import { z } from 'zod';
import aui from '@/lib/aui';
import { useAUITool } from '@/lib/aui/client/hooks';

// Ultra-concise API examples

// 1. Simple tool - just 2 methods
const weatherTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div className="p-2 bg-blue-50 rounded">{data.city}: {data.temp}°F</div>);

// 2. Complex tool with client optimization
const searchTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => {
    // Simulate server-side database search
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      query: input.query,
      results: [
        `Result 1 for "${input.query}"`,
        `Result 2 for "${input.query}"`,
        `Result 3 for "${input.query}"`
      ]
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side caching
    const cacheKey = `search:${input.query}`;
    const cached = ctx.cache.get(cacheKey);
    if (cached) return cached;
    
    const result = await ctx.fetch('/api/aui/execute', {
      method: 'POST',
      body: JSON.stringify({ tool: 'search', input })
    }).then((res: Response) => res.json()).then((data: any) => data.result);
    
    ctx.cache.set(cacheKey, result);
    return result;
  })
  .render(({ data }) => (
    <div className="p-4 bg-green-50 rounded">
      <h3 className="font-bold text-green-900">Search: {data.query}</h3>
      <ul className="mt-2 space-y-1">
        {data.results.map((r, i) => (
          <li key={i} className="text-green-700">• {r}</li>
        ))}
      </ul>
    </div>
  ));

// 3. Calculator tool
const calcTool = aui
  .tool('calculator')
  .input(z.object({ 
    a: z.number(), 
    b: z.number(), 
    op: z.enum(['+', '-', '*', '/']) 
  }))
  .execute(({ input }) => {
    const ops = {
      '+': input.a + input.b,
      '-': input.a - input.b,
      '*': input.a * input.b,
      '/': input.a / input.b
    };
    return { result: ops[input.op], expression: `${input.a} ${input.op} ${input.b}` };
  })
  .render(({ data }) => (
    <div className="p-2 bg-purple-50 rounded font-mono">
      {data.expression} = {data.result}
    </div>
  ));

// 4. Theme switcher tool
const themeTool = aui
  .tool('theme')
  .input(z.object({ mode: z.enum(['light', 'dark', 'auto']) }))
  .execute(({ input }) => ({ 
    mode: input.mode, 
    timestamp: Date.now() 
  }))
  .clientExecute(async ({ input, ctx }) => {
    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', input.mode);
    }
    return { mode: input.mode, timestamp: Date.now() };
  })
  .render(({ data }) => (
    <div className="p-2 bg-gray-100 rounded">
      Theme set to: <span className="font-bold">{data.mode}</span>
    </div>
  ));

export function AUIShowcase() {
  const [city, setCity] = useState('San Francisco');
  const [query, setQuery] = useState('');
  const [calcA, setCalcA] = useState(10);
  const [calcB, setCalcB] = useState(5);
  const [calcOp, setCalcOp] = useState<'+' | '-' | '*' | '/'>( '+');
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  
  const weather = useAUITool(weatherTool);
  const search = useAUITool(searchTool);
  const calc = useAUITool(calcTool);
  const themeSwitch = useAUITool(themeTool);
  
  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-4xl font-bold mb-8 text-center">AUI - Ultra-Concise API</h1>
      
      <div className="grid md:grid-cols-2 gap-8">
        {/* Weather Tool */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Weather Tool</h2>
          <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto mb-4">
{`aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)`}
          </pre>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter city"
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={() => weather.execute({ city })}
              disabled={weather.loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {weather.loading ? 'Loading...' : 'Get Weather'}
            </button>
          </div>
          {weather.data && weather.render?.()}
        </section>

        {/* Search Tool */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Search Tool</h2>
          <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto mb-4">
{`aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)`}
          </pre>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={() => search.execute({ query })}
              disabled={search.loading || !query}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {search.loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          {search.data && search.render?.()}
        </section>

        {/* Calculator Tool */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Calculator Tool</h2>
          <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto mb-4">
{`aui
  .tool('calculator')
  .input(z.object({ a: z.number(), b: z.number(), op: z.enum(['+', '-', '*', '/']) }))
  .execute(({ input }) => calculate(input.a, input.b, input.op))
  .render(({ data }) => <div>{data.expression} = {data.result}</div>)`}
          </pre>
          <div className="flex gap-2 mb-4">
            <input
              type="number"
              value={calcA}
              onChange={(e) => setCalcA(Number(e.target.value))}
              className="w-20 px-2 py-2 border rounded"
            />
            <select
              value={calcOp}
              onChange={(e) => setCalcOp(e.target.value as any)}
              className="px-2 py-2 border rounded"
            >
              <option value="+">+</option>
              <option value="-">-</option>
              <option value="*">*</option>
              <option value="/">/</option>
            </select>
            <input
              type="number"
              value={calcB}
              onChange={(e) => setCalcB(Number(e.target.value))}
              className="w-20 px-2 py-2 border rounded"
            />
            <button
              onClick={() => calc.execute({ a: calcA, b: calcB, op: calcOp })}
              disabled={calc.loading}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              Calculate
            </button>
          </div>
          {calc.data && calc.render?.()}
        </section>

        {/* Theme Tool */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Theme Tool</h2>
          <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto mb-4">
{`aui
  .tool('theme')
  .input(z.object({ mode: z.enum(['light', 'dark', 'auto']) }))
  .execute(({ input }) => ({ mode: input.mode, timestamp: Date.now() }))
  .clientExecute(async ({ input }) => {
    localStorage.setItem('theme', input.mode);
    return { mode: input.mode, timestamp: Date.now() };
  })
  .render(({ data }) => <div>Theme: {data.mode}</div>)`}
          </pre>
          <div className="flex gap-2 mb-4">
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as any)}
              className="flex-1 px-3 py-2 border rounded"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
            <button
              onClick={() => themeSwitch.execute({ mode: theme })}
              disabled={themeSwitch.loading}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
            >
              Set Theme
            </button>
          </div>
          {themeSwitch.data && themeSwitch.render?.()}
        </section>
      </div>

      {/* Key Features */}
      <section className="mt-12 p-8 bg-gradient-to-r from-blue-900 to-purple-900 text-white rounded-lg">
        <h2 className="text-2xl font-semibold mb-6 text-center">Key Features</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-bold mb-2">✨ Ultra-Concise</h3>
            <p className="text-sm opacity-90">No .build() required. Tools are ready immediately after definition.</p>
          </div>
          <div>
            <h3 className="font-bold mb-2">🎯 Type-Safe</h3>
            <p className="text-sm opacity-90">Full TypeScript inference throughout the entire chain.</p>
          </div>
          <div>
            <h3 className="font-bold mb-2">⚡ Optimized</h3>
            <p className="text-sm opacity-90">Optional client-side execution with built-in caching.</p>
          </div>
          <div>
            <h3 className="font-bold mb-2">🔧 Flexible</h3>
            <p className="text-sm opacity-90">Server-side by default, client-side when needed.</p>
          </div>
          <div>
            <h3 className="font-bold mb-2">🎨 Renderable</h3>
            <p className="text-sm opacity-90">Built-in React component rendering for results.</p>
          </div>
          <div>
            <h3 className="font-bold mb-2">🪝 React Hooks</h3>
            <p className="text-sm opacity-90">useAUITool hook for seamless integration.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AUIShowcase;