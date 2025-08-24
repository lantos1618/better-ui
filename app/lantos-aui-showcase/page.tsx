'use client';

import { useState } from 'react';
import aui, { z } from '@/lib/aui/lantos-aui';
import { useAUITool, useAUI } from '@/lib/aui/client/hooks';
import { AUIProvider } from '@/lib/aui/client/provider';

// 1. Ultra-simple tool with do()
const timeToolSimple = aui.do('time', () => new Date().toISOString());

// 2. Simple tool with doWith()
const greetToolSimple = aui.doWith(
  'greet',
  z.object({ name: z.string() }),
  ({ name }) => `Hello, ${name}!`
);

// 3. Standard simple tool
const weatherTool = aui.simple(
  'weather',
  z.object({ city: z.string() }),
  async (input) => {
    await new Promise(r => setTimeout(r, 500));
    return {
      city: input.city,
      temp: Math.floor(Math.random() * 30) + 60,
      conditions: ['Sunny', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 3)]
    };
  },
  (data) => (
    <div className="p-4 bg-blue-50 rounded">
      <h3 className="font-bold">{data.city}</h3>
      <p className="text-2xl">{data.temp}°F</p>
      <p className="text-gray-600">{data.conditions}</p>
    </div>
  )
);

// 4. AI-optimized tool with retry and caching
const searchTool = aui.ai('search', {
  input: z.object({ 
    query: z.string().min(1),
    limit: z.number().optional().default(5)
  }),
  execute: async ({ input }) => {
    // Simulate API that sometimes fails
    if (Math.random() < 0.3) {
      throw new Error('Search API temporarily unavailable');
    }
    await new Promise(r => setTimeout(r, 800));
    return {
      query: input.query,
      results: Array.from({ length: input.limit }, (_, i) => ({
        id: i + 1,
        title: `Result ${i + 1} for "${input.query}"`,
        score: Math.random()
      })).sort((a, b) => b.score - a.score)
    };
  },
  retry: 3,
  cache: true,
  render: ({ data }) => (
    <div className="space-y-2">
      <h3 className="font-semibold">Results for "{data.query}"</h3>
      {data.results.map(r => (
        <div key={r.id} className="p-2 bg-gray-50 rounded">
          <div className="font-medium">{r.title}</div>
          <div className="text-xs text-gray-500">Score: {r.score.toFixed(2)}</div>
        </div>
      ))}
    </div>
  )
});

// 5. Complex tool with client optimization
const analyticsTool = aui
  .tool('analytics')
  .input(z.object({
    metric: z.enum(['views', 'clicks', 'conversions']),
    period: z.enum(['day', 'week', 'month'])
  }))
  .execute(async ({ input }) => {
    // Server-side: fetch from database
    await new Promise(r => setTimeout(r, 1000));
    return {
      metric: input.metric,
      period: input.period,
      value: Math.floor(Math.random() * 10000),
      trend: Math.random() > 0.5 ? 'up' : 'down',
      percentage: Math.floor(Math.random() * 50)
    };
  })
  .clientExecute(async ({ input, ctx }) => {
    // Client-side: check cache first
    const cacheKey = `analytics:${input.metric}:${input.period}`;
    const cached = ctx.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 30000) {
      console.log('Using cached analytics');
      return cached.data;
    }
    
    // Fetch from server
    const result = await ctx.fetch('/execute', {
      method: 'POST',
      body: JSON.stringify({ tool: 'analytics', input })
    });
    
    // Cache with timestamp
    ctx.cache.set(cacheKey, {
      data: result.data,
      timestamp: Date.now()
    });
    
    return result.data;
  })
  .render(({ data }) => (
    <div className="p-4 bg-purple-50 rounded">
      <h3 className="font-bold capitalize">{data.metric} - {data.period}</h3>
      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold">{data.value.toLocaleString()}</span>
        <span className={`text-sm ${data.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
          {data.trend === 'up' ? '↑' : '↓'} {data.percentage}%
        </span>
      </div>
    </div>
  ));

// 6. Batch define multiple tools
const batchTools = aui.defineTools({
  calculator: {
    input: z.object({ a: z.number(), b: z.number(), op: z.enum(['+', '-', '*', '/']) }),
    execute: ({ input }) => {
      const ops = {
        '+': (a: number, b: number) => a + b,
        '-': (a: number, b: number) => a - b,
        '*': (a: number, b: number) => a * b,
        '/': (a: number, b: number) => a / b,
      };
      return { result: ops[input.op](input.a, input.b) };
    }
  },
  randomQuote: {
    execute: async () => {
      const quotes = [
        "The only way to do great work is to love what you do.",
        "Innovation distinguishes between a leader and a follower.",
        "Stay hungry, stay foolish."
      ];
      return { quote: quotes[Math.floor(Math.random() * quotes.length)] };
    }
  }
});

function ShowcaseContent() {
  const [city, setCity] = useState('San Francisco');
  const [searchQuery, setSearchQuery] = useState('');
  const [name, setName] = useState('');
  
  // Use individual tools
  const weather = useAUITool(weatherTool, { cache: true });
  const search = useAUITool(searchTool, { debounce: 500 });
  const analytics = useAUITool(analyticsTool);
  
  // Use batch management
  const auiManager = useAUI();

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-4xl font-bold mb-2">Lantos AUI Showcase</h1>
      <p className="text-gray-600 mb-8">Demonstrating all AUI features and patterns</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Simple Tools */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Simple Tools</h2>
          
          <div className="p-4 border rounded">
            <h3 className="font-medium mb-2">Time Tool (do)</h3>
            <button
              onClick={async () => {
                const time = await timeToolSimple.run(undefined);
                alert(`Current time: ${time}`);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Get Time
            </button>
          </div>

          <div className="p-4 border rounded">
            <h3 className="font-medium mb-2">Greet Tool (doWith)</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter name"
                className="px-3 py-2 border rounded flex-1"
              />
              <button
                onClick={async () => {
                  const greeting = await greetToolSimple.run({ name: name || 'World' });
                  alert(greeting);
                }}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Greet
              </button>
            </div>
          </div>
        </section>

        {/* Weather Tool */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Weather Tool (simple)</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City name"
              className="px-3 py-2 border rounded flex-1"
            />
            <button
              onClick={() => weather.execute({ city })}
              disabled={weather.loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {weather.loading ? 'Loading...' : 'Get Weather'}
            </button>
          </div>
          {weather.error && (
            <div className="p-3 bg-red-50 text-red-700 rounded">
              {weather.error.message}
            </div>
          )}
          {weather.data && weather.render?.()}
        </section>

        {/* Search Tool */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Search Tool (AI-optimized)</h2>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (e.target.value) {
                search.execute({ query: e.target.value, limit: 5 });
              }
            }}
            placeholder="Search (with debounce & retry)..."
            className="w-full px-3 py-2 border rounded"
          />
          {search.loading && <div className="text-gray-500">Searching...</div>}
          {search.error && (
            <div className="p-3 bg-red-50 text-red-700 rounded">
              {search.error.message} (Will retry automatically)
            </div>
          )}
          {search.data && search.render?.()}
        </section>

        {/* Analytics Tool */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Analytics (Client Cached)</h2>
          <div className="grid grid-cols-3 gap-2">
            {(['views', 'clicks', 'conversions'] as const).map(metric => (
              <button
                key={metric}
                onClick={() => analytics.execute({ metric, period: 'week' })}
                disabled={analytics.loading}
                className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 text-sm"
              >
                {metric}
              </button>
            ))}
          </div>
          {analytics.loading && <div className="text-gray-500">Loading analytics...</div>}
          {analytics.data && analytics.render?.()}
        </section>

        {/* Batch Tools */}
        <section className="space-y-4 md:col-span-2">
          <h2 className="text-2xl font-semibold">Batch Defined Tools</h2>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={async () => {
                const result = await batchTools.calculator.run({ a: 10, b: 5, op: '*' });
                alert(`10 * 5 = ${result.result}`);
              }}
              className="p-4 bg-indigo-500 text-white rounded hover:bg-indigo-600"
            >
              Calculate 10 * 5
            </button>
            <button
              onClick={async () => {
                const result = await batchTools.randomQuote.run(undefined);
                alert(result.quote);
              }}
              className="p-4 bg-teal-500 text-white rounded hover:bg-teal-600"
            >
              Get Random Quote
            </button>
          </div>
        </section>

        {/* Multi-Tool Management */}
        <section className="space-y-4 md:col-span-2">
          <h2 className="text-2xl font-semibold">Multi-Tool Management</h2>
          <div className="flex gap-4">
            <button
              onClick={() => auiManager.executeTool('weather', { city: 'Tokyo' })}
              disabled={auiManager.isLoading('weather')}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            >
              {auiManager.isLoading('weather') ? 'Loading...' : 'Tokyo Weather'}
            </button>
            <button
              onClick={() => auiManager.executeTool('search', { query: 'AI tools' })}
              disabled={auiManager.isLoading('search')}
              className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 disabled:opacity-50"
            >
              {auiManager.isLoading('search') ? 'Searching...' : 'Search AI Tools'}
            </button>
            <button
              onClick={() => auiManager.clearAll()}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Clear All Results
            </button>
          </div>
          
          {Object.keys(auiManager.results).length > 0 && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <h3 className="font-semibold mb-2">Results:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(auiManager.results, null, 2)}
              </pre>
            </div>
          )}
        </section>
      </div>

      {/* API Examples */}
      <section className="mt-12 p-6 bg-gray-900 text-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">API Patterns</h2>
        <pre className="text-sm overflow-x-auto">
{`// 1. Ultra-simple (no input)
aui.do('time', () => new Date().toISOString())

// 2. Simple with input
aui.doWith('greet', z.object({ name: z.string() }), 
  ({ name }) => \`Hello, \${name}!\`)

// 3. Standard simple tool
aui.simple('weather', schema, handler, render)

// 4. AI-optimized with retry & cache
aui.ai('search', { input, execute, retry: 3, cache: true })

// 5. Full control
aui.tool('name')
  .input(schema)
  .execute(serverHandler)
  .clientExecute(clientHandler)
  .render(component)

// 6. Batch definition
aui.defineTools({ tool1: {...}, tool2: {...} })

// 7. Direct execution
await aui.execute('toolName', input, context)`}
        </pre>
      </section>
    </div>
  );
}

export default function LantosAUIShowcase() {
  return (
    <AUIProvider>
      <ShowcaseContent />
    </AUIProvider>
  );
}