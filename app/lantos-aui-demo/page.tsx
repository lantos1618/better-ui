'use client';

import { useState } from 'react';
import { weatherTool, searchTool, greetTool, apiTool, dbTools } from '@/lib/aui/lantos-aui-examples';
import { useAUITool, useAUI } from '@/lib/aui/lantos-aui-hooks';

export default function LantosAUIDemo() {
  // Simple tool states
  const [city, setCity] = useState('San Francisco');
  const [searchQuery, setSearchQuery] = useState('');
  const [name, setName] = useState('');
  const [endpoint, setEndpoint] = useState('/api/test');
  const [sql, setSql] = useState('SELECT * FROM users');
  
  // Use hooks for tools
  const weather = useAUITool(weatherTool);
  const search = useAUITool(searchTool);
  const greet = useAUITool(greetTool);
  const api = useAUITool(apiTool);
  const query = useAUITool(dbTools.query);
  
  // Multi-tool hook
  const aui = useAUI();

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      <h1 className="text-4xl font-bold mb-2">Lantos AUI - Ultra-Concise API</h1>
      <p className="text-gray-600 mb-8">No .build() required! Tools work immediately.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Weather Tool */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Simple Tool</h2>
          <pre className="bg-gray-100 p-3 rounded text-xs mb-4 overflow-x-auto">
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
            <div className="p-3 bg-red-50 text-red-700 rounded mb-4">
              {weather.error.message}
            </div>
          )}
          
          {weather.data && weather.render?.()}
        </section>

        {/* Search Tool with Caching */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Complex Tool with Cache</h2>
          <pre className="bg-gray-100 p-3 rounded text-xs mb-4 overflow-x-auto">
{`aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/search', { body: input });
  })
  .render(({ data }) => <Results data={data} />)`}
          </pre>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="px-3 py-2 border rounded flex-1"
            />
            <button
              onClick={() => search.execute({ query: searchQuery })}
              disabled={search.loading || !searchQuery}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {search.loading ? 'Searching...' : 'Search'}
            </button>
          </div>
          
          {search.error && (
            <div className="p-3 bg-red-50 text-red-700 rounded mb-4">
              {search.error.message}
            </div>
          )}
          
          {search.data && search.render?.()}
        </section>

        {/* Simple Helper */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Simple Helper</h2>
          <pre className="bg-gray-100 p-3 rounded text-xs mb-4 overflow-x-auto">
{`aui.simple(
  'greet',
  z.object({ name: z.string() }),
  ({ name }) => \`Hello, \${name}!\`,
  msg => <h2>{msg}</h2>
)`}
          </pre>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="px-3 py-2 border rounded flex-1"
            />
            <button
              onClick={() => greet.execute({ name })}
              disabled={greet.loading || !name}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              Greet
            </button>
          </div>
          
          {greet.data && greet.render?.()}
        </section>

        {/* AI-Optimized Tool */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">AI-Optimized (Retry + Cache)</h2>
          <pre className="bg-gray-100 p-3 rounded text-xs mb-4 overflow-x-auto">
{`aui.ai('apiCall', {
  input: z.object({ endpoint: z.string() }),
  execute: async ({ input }) => fetch(input.endpoint),
  render: ({ data }) => <code>{data}</code>,
  retry: 3,
  cache: true
})`}
          </pre>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="API endpoint"
              className="px-3 py-2 border rounded flex-1"
            />
            <button
              onClick={() => api.execute({ endpoint })}
              disabled={api.loading}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
            >
              {api.loading ? 'Calling...' : 'Call API'}
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mb-2">
            30% chance of failure, will retry up to 3 times
          </p>
          
          {api.error && (
            <div className="p-3 bg-red-50 text-red-700 rounded mb-4">
              {api.error.message}
            </div>
          )}
          
          {api.data && api.render?.()}
        </section>

        {/* Database Tools */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Batch Definition</h2>
          <pre className="bg-gray-100 p-3 rounded text-xs mb-4 overflow-x-auto">
{`aui.defineTools({
  query: {
    input: z.object({ sql: z.string() }),
    execute: async ({ input }) => db.query(input.sql),
    render: ({ data }) => <Table rows={data} />
  },
  insert: { ... }
})`}
          </pre>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder="SQL query"
              className="px-3 py-2 border rounded flex-1 font-mono text-sm"
            />
            <button
              onClick={() => query.execute({ sql })}
              disabled={query.loading}
              className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 disabled:opacity-50"
            >
              {query.loading ? 'Querying...' : 'Query'}
            </button>
          </div>
          
          {query.data && query.render?.()}
        </section>

        {/* One-liner Example */}
        <section className="border rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Ultra-Concise Patterns</h2>
          <div className="space-y-4">
            <div>
              <pre className="bg-gray-100 p-3 rounded text-xs mb-2">
{`// One-liner
aui.do('ping', () => 'pong')`}
              </pre>
              <button
                onClick={async () => {
                  const ping = aui.get('ping');
                  if (ping) {
                    const result = await ping.run(undefined);
                    alert(result);
                  }
                }}
                className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
              >
                Test Ping
              </button>
            </div>
            
            <div>
              <pre className="bg-gray-100 p-3 rounded text-xs">
{`// Shorthand
aui.t('calc')  // t = tool
  .i(z.object({ a: z.number() }))  // i = input
  .e(({ a }) => a * 2)  // e = execute
  .r(r => <span>{r}</span>)  // r = render`}
              </pre>
            </div>
          </div>
        </section>
      </div>

      {/* Features Summary */}
      <section className="mt-12 p-6 bg-gray-900 text-gray-100 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-semibold mb-2">Core API</h3>
            <ul className="space-y-1">
              <li>✅ No .build() required - tools work immediately</li>
              <li>✅ Full TypeScript inference</li>
              <li>✅ Fluent chainable API</li>
              <li>✅ Server and client execution</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Helper Methods</h3>
            <ul className="space-y-1">
              <li>✅ aui.do() - one-liner tools</li>
              <li>✅ aui.simple() - quick tool creation</li>
              <li>✅ aui.ai() - retry + cache built-in</li>
              <li>✅ aui.defineTools() - batch definition</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">React Integration</h3>
            <ul className="space-y-1">
              <li>✅ useAUITool() hook</li>
              <li>✅ useAUI() for multiple tools</li>
              <li>✅ Built-in render methods</li>
              <li>✅ Context providers</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">AI Control</h3>
            <ul className="space-y-1">
              <li>✅ Frontend control via tools</li>
              <li>✅ Backend service control</li>
              <li>✅ Automatic retries</li>
              <li>✅ Smart caching</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}